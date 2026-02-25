
// screens/SupportTicketDetail.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput,
  RefreshControl, Animated, Modal, Dimensions, Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import { api, IMAGE_BASE_URL } from '../api/client';

import { scale, moderateScale } from '../utils/responsive';
const toStorageUrl = (u) => {
  if (!u) return '';
  const s = String(u).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) && !/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(s)) return s;
  const m = s.match(/\/storage\/(.+)$/);
  const tail = m ? m[1] : s.replace(/^\/?storage\/?/, '');
  const base = IMAGE_BASE_URL.replace(/\/$/, '');
  const cleanTail = tail.replace(/^\/+/, '');
  return `${base}/${cleanTail}`;
};

const C = {
  primary: '#EF3A3A',
  primaryDark: '#D42E2E',
  ink: '#1D2254',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  ok: '#10B981',
  warn: '#F59E0B',
  info: '#3B82F6',
  indigo: '#6366F1',
  danger: '#EF4444',
};
const R = 18;
const { width: W } = Dimensions.get('window');

const STATUS = {
  pending:   { label: 'Pending',   gradient: ['#FBBF24', '#F59E0B'], step: 1, icon: 'time-outline' },
  seen:      { label: 'Seen',      gradient: ['#60A5FA', '#2563EB'], step: 2, icon: 'eye-outline' },
  onwork:    { label: 'On work',   gradient: ['#818CF8', '#4F46E5'], step: 3, icon: 'construct-outline' },
  completed: { label: 'Completed', gradient: ['#34D399', '#059669'], step: 4, icon: 'checkmark-circle' },
  rejected:  { label: 'Rejected',  gradient: ['#F87171', '#DC2626'], step: 4, icon: 'close-circle' },
};

const PIPE = ['pending', 'seen', 'onwork', 'completed'];
const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function SupportTicketDetail({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const ticketId = route?.params?.ticketId;
  const [ticket, setTicket] = useState(null);
  const [thread, setThread] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const canDelete = ticket?.status === 'pending';
  const [askDelete, setAskDelete] = useState(false);

  const deleteTicket = async () => {
    try {
      await api.delete(`/support/tickets/${ticketId}`);
      setAskDelete(false);
      navigation.goBack();
    } catch (error) {
      if (error.response?.status === 405) alert('Server error: Method not allowed.');
      else if (error.response?.status === 403) alert(error.response.data?.message || 'Not authorized');
      else if (error.response?.status === 404) alert('Ticket not found or already deleted');
      else alert(error?.response?.data?.message || 'Failed to delete ticket');
      setAskDelete(false);
    }
  };

  const [viewer, setViewer] = useState(null);
  const [text, setText] = useState('');
  const [draftPhotos, setDraftPhotos] = useState([]);

  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.5, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => { clearTimeout(t); loop.stop(); };
  }, [pulse]);

  const loadTicket = useCallback(async () => {
    try {
      const res = await api.get(`/support/tickets/${ticketId}`);
      const t = res?.data;
      const mapped = {
        id: t.id,
        title: t.equipment_name || 'Support ticket',
        category: 'Equipment',
        equipment: t.equipment_name || '-',
        created: t.created_at,
        status: t.status,
      };
      const thr = (t.threads || []).map(x => ({
        id: x.id,
        author: x.sender_owner_id ? 'owner' : 'support',
        time: x.created_at,
        text: x.message || undefined,
        photos: x.photo_path ? [toStorageUrl(x.photo_path)] : [],
      }));
      setTicket(mapped);
      setThread(thr);
    } catch (e) {
      console.log('Load ticket failed', e?.response?.data || e?.message);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    loadTicket();
  }, [ticketId, loadTicket]);

  const onRefresh = async () => { setRefreshing(true); await loadTicket(); setRefreshing(false); };
  const callSupport = async () => { try { await Linking.openURL('tel:8347122756'); } catch {} };

  const attachmentsTop = useMemo(() => {
    const imgs = [];
    thread.forEach(m => (m.photos || []).forEach(p => imgs.push(p)));
    return imgs.slice(-4).reverse();
  }, [thread]);

  const adminHasSentMessage = thread.some(m => m.author === 'support');
  const canChat = (ticket?.status === 'seen' && adminHasSentMessage) || ticket?.status === 'onwork';
  const closed = ticket?.status === 'completed' || ticket?.status === 'rejected';

  const sendUpdate = async () => {
    if (!canChat || (!text.trim() && draftPhotos.length === 0)) return;
    try {
      const form = new FormData();
      if (text.trim()) form.append('message', text.trim());
      if (draftPhotos[0]?.uri) {
        form.append('photo', { uri: draftPhotos[0].uri, type: 'image/jpeg', name: `photo_${Date.now()}.jpg` });
      }
      await api.post(`/support/tickets/${ticketId}/messages`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setText(''); setDraftPhotos([]);
      await loadTicket();
    } catch (e) {
      console.log('Send message failed', e?.response?.data || e?.message);
    }
  };

  const pickPhotos = async () => {
    if (!canChat) return;
    try {
      const res = await launchImageLibrary({ mediaType: 'photo', quality: 0.85, selectionLimit: Math.max(1, 5 - draftPhotos.length) });
      if (res?.assets?.length) {
        setDraftPhotos(prev => [...prev, ...res.assets.map(a => ({ uri: a.uri }))].slice(0, 5));
      }
    } catch {}
  };
  const removeDraft = (uri) => setDraftPhotos(prev => prev.filter(p => p.uri !== uri));

  const M = STATUS[ticket?.status || 'pending'] || STATUS.pending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {/* Gradient Header */}
      <LinearGradient colors={[C.primary, C.primaryDark]} style={st.headerGrad}>
        <View style={st.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.hBtn}>
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <Text style={st.hTitle} numberOfLines={1}>Ticket</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: scale(8) }}>
          {canDelete && (
            <TouchableOpacity onPress={deleteTicket} style={[st.hBtn, { backgroundColor: 'rgba(255,100,100,0.3)' }]}>
              <Icon name="trash-outline" size={scale(18)} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={callSupport} style={st.hBtn}>
            <Icon name="call-outline" size={scale(18)} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Body */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + scale(120) }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ paddingHorizontal: scale(16), paddingTop: scale(12) }}>
            <Animated.View style={[st.skelHero, { opacity: pulse }]} />
            <Animated.View style={[st.skelLine, { opacity: pulse, width: '70%' }]} />
            <Animated.View style={[st.skelCard, { opacity: pulse }]} />
          </View>
        ) : (
          <>
            {/* Summary Card */}
            <View style={st.card}>
              <LinearGradient colors={M.gradient} style={st.cardAccent} />
              <View style={st.cardInner}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: scale(12) }}>
                    <Text style={st.title}>{ticket?.title || 'Support ticket'}</Text>
                    <View style={st.metaRow}>
                      <View style={st.metaItem}>
                        <Icon name="finger-print-outline" size={scale(12)} color={C.muted} />
                        <Text style={st.metaText}>#{ticket?.id}</Text>
                      </View>
                      <View style={st.metaItem}>
                        <Icon name="calendar-outline" size={scale(12)} color={C.muted} />
                        <Text style={st.metaText}>{fmt(ticket?.created)}</Text>
                      </View>
                    </View>
                    <View style={st.metaRow}>
                      <View style={st.metaItem}>
                        <Icon name="folder-outline" size={scale(12)} color={C.muted} />
                        <Text style={st.metaText}>{ticket?.category}</Text>
                      </View>
                      {ticket?.equipment && ticket.equipment !== '-' && (
                        <View style={st.metaItem}>
                          <Icon name="hardware-chip-outline" size={scale(12)} color={C.muted} />
                          <Text style={st.metaText}>{ticket.equipment}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <LinearGradient colors={M.gradient} style={st.badge}>
                    <Icon name={M.icon} size={scale(13)} color="#fff" />
                    <Text style={st.badgeTxt}>{M.label}</Text>
                  </LinearGradient>
                </View>

                {/* Image strip */}
                {attachmentsTop.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: scale(8), marginTop: scale(12) }}>
                    {attachmentsTop.map((uri, i) => (
                      <TouchableOpacity key={uri + i} onPress={() => setViewer(uri)} style={st.thumb}>
                        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* State banners */}
            {!canChat && !closed && (
              <View style={st.infoBanner}>
                <LinearGradient colors={['#FFF7ED', '#FFFBEB']} style={st.infoBannerInner}>
                  <View style={st.infoBannerIcon}>
                    <Icon name="time-outline" size={scale(14)} color={C.warn} />
                  </View>
                  <Text style={st.infoText}>
                    {ticket?.status === 'seen' && !adminHasSentMessage
                      ? 'Chat will open after admin sends first message.'
                      : 'Chat opens when the ticket moves to On work.'
                    }
                  </Text>
                </LinearGradient>
              </View>
            )}
            {closed && (
              <View style={st.infoBanner}>
                <LinearGradient colors={['#ECFDF5', '#F0FDF4']} style={st.infoBannerInner}>
                  <View style={[st.infoBannerIcon, { backgroundColor: '#D1FAE5' }]}>
                    <Icon name="checkmark-done-outline" size={scale(14)} color={C.ok} />
                  </View>
                  <Text style={st.infoText}>This ticket is closed. You can view history below.</Text>
                </LinearGradient>
              </View>
            )}

            {/* Conversation */}
            <View style={st.sectionTitleRow}>
              <Icon name="chatbubbles-outline" size={scale(16)} color={C.ink} />
              <Text style={st.sectionTitle}>Conversation</Text>
              <View style={st.threadCountBadge}>
                <Text style={st.threadCountText}>{thread.length}</Text>
              </View>
              <View style={st.sectionLine} />
            </View>
            <View style={{ paddingHorizontal: scale(16) }}>
              {thread.length === 0 ? (
                <View style={st.noMsgBox}>
                  <Icon name="chatbox-outline" size={scale(28)} color={C.muted} />
                  <Text style={st.noMsgText}>No messages yet</Text>
                </View>
              ) : (
                thread.map(m => <Message key={m.id} m={m} onImage={setViewer} />)
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Composer */}
      <View style={[st.composerWrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={[st.composerCard, (!canChat || closed) && { opacity: 0.55 }]}>
          <TouchableOpacity onPress={pickPhotos} disabled={!canChat || closed} style={st.attachBtn} activeOpacity={0.8}>
            <Icon name="images-outline" size={scale(18)} color={C.primary} />
          </TouchableOpacity>

          <View style={{ flex: 1, paddingRight: scale(48) }}>
            <TextInput
              placeholder={canChat ? "Write an update..." : closed ? "Ticket closed" :
                ticket?.status === 'seen' && !adminHasSentMessage ? "Wait for admin's first message" : "Locked until work starts"}
              placeholderTextColor="#9CA3AF"
              value={text}
              onChangeText={setText}
              style={st.composerInput}
              editable={canChat && !closed}
              multiline
            />
            {draftPhotos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: scale(8) }}>
                {draftPhotos.map(p => (
                  <View key={p.uri} style={st.draftBox}>
                    <Image source={{ uri: p.uri }} style={st.draftImg} />
                    <TouchableOpacity onPress={() => removeDraft(p.uri)} style={st.draftDel}>
                      <Icon name="close" size={scale(12)} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <TouchableOpacity
            onPress={sendUpdate}
            disabled={!canChat || closed || (!text.trim() && draftPhotos.length === 0)}
            activeOpacity={0.9}
            style={{ position: 'absolute', right: scale(10), bottom: scale(10) }}
          >
            <LinearGradient
              colors={(!canChat || closed || (!text.trim() && draftPhotos.length === 0)) ? ['#E2E8F0', '#E2E8F0'] : [C.primary, C.primaryDark]}
              style={st.fabSend}
            >
              <Icon name="paper-plane" size={scale(16)} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete confirm */}
      <Modal visible={askDelete} transparent animationType="fade" onRequestClose={() => setAskDelete(false)}>
        <View style={st.overlay}>
          <View style={st.sheet}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: scale(6) }}>
              <LinearGradient colors={['#F87171', '#DC2626']} style={st.sheetIcon}>
                <Icon name="trash" size={scale(16)} color="#fff" />
              </LinearGradient>
              <Text style={st.sheetTitle}>Delete ticket?</Text>
            </View>
            <Text style={st.sheetSub}>Only pending tickets can be deleted. This action cannot be undone.</Text>
            <View style={{ flexDirection: 'row', gap: scale(10), marginTop: scale(12) }}>
              <TouchableOpacity onPress={() => setAskDelete(false)} style={[st.outBtn, { flex: 1 }]}>
                <Text style={st.outTxt}>No, keep</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setAskDelete(false); navigation.goBack(); }} style={{ flex: 1 }}>
                <LinearGradient colors={['#F87171', '#DC2626']} style={st.dangerBtn}>
                  <Text style={st.dangerTxt}>Delete</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Viewer */}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={st.viewer}>
          <TouchableOpacity onPress={() => setViewer(null)} style={st.viewerClose}>
            <Icon name="close" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: viewer }} style={{ width: W * 0.92, height: W * 1.1, borderRadius: scale(16) }} resizeMode="contain" />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* Message Bubble */
function Message({ m, onImage }) {
  if (m.author === 'system') {
    const meta = STATUS[m.status] || STATUS.pending;
    return (
      <View style={st.sysRow}>
        <LinearGradient colors={[meta.gradient[0] + '20', meta.gradient[1] + '15']} style={st.sysBadge}>
          <Icon name={meta.icon} size={scale(12)} color={meta.gradient[1]} />
          <Text style={[st.sysTxt, { color: meta.gradient[1] }]}>{STATUS[m.status]?.label || 'Updated'}</Text>
        </LinearGradient>
        {!!m.text && <Text style={st.sysNote}>{m.text}</Text>}
        <Text style={st.sysTime}>{fmt(m.time)}</Text>
      </View>
    );
  }
  const isOwner = m.author === 'owner';
  return (
    <View style={[st.msgRow, isOwner ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
      {!isOwner && (
        <View style={st.avatarSm}>
          <Image
            source={require('../assets/images/kni-logo.png')}
            style={st.avatarImg}
            resizeMode="cover"
          />
        </View>
      )}
      {isOwner ? (
        <LinearGradient colors={[C.primary, C.primaryDark]} style={[st.bubble, st.bubbleOwner]}>
          {!!m.text && <Text style={[st.msgText, { color: '#fff' }]}>{m.text}</Text>}
          {!!m.photos?.length && (
            <View style={{ flexDirection: 'row', gap: scale(6), marginTop: scale(6), flexWrap: 'wrap' }}>
              {m.photos.map((uri, i) => (
                <TouchableOpacity key={uri + i} onPress={() => onImage(uri)} style={st.msgImgBox}>
                  <Image source={{ uri }} style={st.msgImg} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={[st.msgTime, { color: '#FDE2E2' }]}>{fmt(m.time)}</Text>
        </LinearGradient>
      ) : (
        <View style={[st.bubble, st.bubbleSupport]}>
          {!!m.text && <Text style={st.msgText}>{m.text}</Text>}
          {!!m.photos?.length && (
            <View style={{ flexDirection: 'row', gap: scale(6), marginTop: scale(6), flexWrap: 'wrap' }}>
              {m.photos.map((uri, i) => (
                <TouchableOpacity key={uri + i} onPress={() => onImage(uri)} style={st.msgImgBox}>
                  <Image source={{ uri }} style={st.msgImg} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={st.msgTime}>{fmt(m.time)}</Text>
        </View>
      )}
      {isOwner && (
        <View style={st.avatarSmOwner}>
          <Icon name="person" size={scale(12)} color="#fff" />
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  headerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  hBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hTitle: { color: '#fff', fontWeight: '900', fontSize: moderateScale(22) },

  skelHero: { height: scale(120), backgroundColor: '#E9EEF5', borderRadius: R, marginBottom: scale(10) },
  skelLine: { height: scale(14), backgroundColor: '#E9EEF5', borderRadius: scale(8), marginBottom: scale(10) },
  skelCard: { height: scale(120), backgroundColor: '#E9EEF5', borderRadius: R },

  card: {
    backgroundColor: C.card,
    borderRadius: R,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginHorizontal: scale(16),
    marginTop: scale(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(3) },
    shadowOpacity: 0.06,
    shadowRadius: scale(10),
    elevation: 3,
  },
  cardAccent: { height: scale(4) },
  cardInner: { padding: scale(14) },
  title: { color: C.text, fontWeight: '900', fontSize: moderateScale(18) },
  metaRow: { flexDirection: 'row', gap: scale(12), marginTop: scale(6), flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  metaText: { color: C.muted, fontSize: moderateScale(12), fontWeight: '500' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: scale(5), paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(999) },
  badgeTxt: { fontWeight: '800', fontSize: moderateScale(11), color: '#fff' },

  thumb: { width: scale(64), height: scale(64), borderRadius: scale(12), overflow: 'hidden', borderWidth: 1, borderColor: '#EEF2F7' },

  infoBanner: { marginHorizontal: scale(16), marginTop: scale(10) },
  infoBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    borderRadius: scale(14),
    gap: scale(10),
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  infoBannerIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1, color: C.text, fontSize: moderateScale(13), lineHeight: moderateScale(18) },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginTop: scale(16),
    marginBottom: scale(10),
    gap: scale(8),
  },
  sectionTitle: { color: C.ink, fontWeight: '900', fontSize: moderateScale(16) },
  threadCountBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(10),
  },
  threadCountText: { fontSize: moderateScale(11), fontWeight: '800', color: C.primary },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },

  noMsgBox: { alignItems: 'center', paddingVertical: scale(30), gap: scale(8) },
  noMsgText: { color: C.muted, fontSize: moderateScale(13) },

  // Conversation
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: scale(6) },
  avatarSm: { width: scale(24), height: scale(24), borderRadius: scale(12), backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginHorizontal: scale(6) },
  avatarImg: { width: scale(24), height: scale(24), borderRadius: scale(12) },
  avatarSmOwner: { width: scale(24), height: scale(24), borderRadius: scale(12), backgroundColor: '#FCA5A5', alignItems: 'center', justifyContent: 'center', marginHorizontal: scale(6) },

  bubble: { maxWidth: W * 0.76, borderRadius: scale(16), padding: scale(12) },
  bubbleOwner: { borderTopRightRadius: scale(6) },
  bubbleSupport: { backgroundColor: C.card, borderWidth: 1, borderColor: '#EEF2F7', borderTopLeftRadius: scale(6) },
  msgText: { color: C.text, fontSize: moderateScale(14), lineHeight: moderateScale(20) },
  msgTime: { marginTop: scale(6), fontSize: moderateScale(11), color: '#94A3B8' },
  msgImgBox: { width: scale(96), height: scale(96), borderRadius: scale(10), overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  msgImg: { width: '100%', height: '100%' },

  sysRow: { alignItems: 'center', marginVertical: scale(10), paddingHorizontal: scale(16) },
  sysBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingHorizontal: scale(12), paddingVertical: scale(7), borderRadius: scale(999) },
  sysTxt: { fontWeight: '800', fontSize: moderateScale(12) },
  sysNote: { color: C.muted, marginTop: scale(6), textAlign: 'center' },
  sysTime: { color: '#94A3B8', fontSize: moderateScale(11), marginTop: scale(6) },

  // Composer
  composerWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: C.card,
    borderTopWidth: 1, borderColor: '#EEF2F7',
    paddingHorizontal: scale(12), paddingTop: scale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(-3) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 5,
  },
  composerCard: {
    flexDirection: 'row', alignItems: 'flex-end', padding: scale(10),
    backgroundColor: C.card, borderRadius: scale(18),
    borderWidth: 1, borderColor: '#EEF2F7',
  },
  attachBtn: {
    width: scale(38), height: scale(38), borderRadius: scale(12),
    borderWidth: 1, borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center', marginRight: scale(8),
  },
  composerInput: {
    color: C.text, fontSize: moderateScale(15), lineHeight: moderateScale(20),
    minHeight: scale(20), maxHeight: scale(120), paddingTop: scale(4), paddingBottom: scale(4),
  },
  fabSend: {
    width: scale(40), height: scale(40), borderRadius: scale(20),
    alignItems: 'center', justifyContent: 'center',
  },

  draftBox: { width: scale(56), height: scale(56), borderRadius: scale(10), overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', marginRight: scale(8) },
  draftImg: { width: '100%', height: '100%' },
  draftDel: { position: 'absolute', top: scale(4), right: scale(4), backgroundColor: 'rgba(0,0,0,0.55)', width: scale(18), height: scale(18), borderRadius: scale(9), alignItems: 'center', justifyContent: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(16) },
  sheet: { width: W * 0.86, backgroundColor: C.card, borderRadius: R, padding: scale(16), borderWidth: 1, borderColor: '#EEF2F7' },
  sheetIcon: { width: scale(34), height: scale(34), borderRadius: scale(10), alignItems: 'center', justifyContent: 'center', marginRight: scale(10) },
  sheetTitle: { color: C.ink, fontWeight: '900', fontSize: moderateScale(18) },
  sheetSub: { color: C.muted, marginTop: scale(2), lineHeight: moderateScale(18) },

  dangerBtn: { borderRadius: scale(12), paddingVertical: scale(12), alignItems: 'center', justifyContent: 'center' },
  dangerTxt: { color: '#fff', fontWeight: '900' },
  outBtn: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: scale(12), paddingVertical: scale(12), alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  outTxt: { color: C.ink, fontWeight: '900' },

  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: scale(18), right: scale(18), width: scale(36), height: scale(36), borderRadius: scale(12), backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});
