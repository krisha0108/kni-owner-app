
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
            <Icon name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={st.hTitle} numberOfLines={1}>Ticket</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {canDelete && (
            <TouchableOpacity onPress={deleteTicket} style={[st.hBtn, { backgroundColor: 'rgba(255,100,100,0.3)' }]}>
              <Icon name="trash-outline" size={18} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={callSupport} style={st.hBtn}>
            <Icon name="call-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Body */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
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
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={st.title}>{ticket?.title || 'Support ticket'}</Text>
                    <View style={st.metaRow}>
                      <View style={st.metaItem}>
                        <Icon name="finger-print-outline" size={12} color={C.muted} />
                        <Text style={st.metaText}>#{ticket?.id}</Text>
                      </View>
                      <View style={st.metaItem}>
                        <Icon name="calendar-outline" size={12} color={C.muted} />
                        <Text style={st.metaText}>{fmt(ticket?.created)}</Text>
                      </View>
                    </View>
                    <View style={st.metaRow}>
                      <View style={st.metaItem}>
                        <Icon name="folder-outline" size={12} color={C.muted} />
                        <Text style={st.metaText}>{ticket?.category}</Text>
                      </View>
                      {ticket?.equipment && ticket.equipment !== '-' && (
                        <View style={st.metaItem}>
                          <Icon name="hardware-chip-outline" size={12} color={C.muted} />
                          <Text style={st.metaText}>{ticket.equipment}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <LinearGradient colors={M.gradient} style={st.badge}>
                    <Icon name={M.icon} size={13} color="#fff" />
                    <Text style={st.badgeTxt}>{M.label}</Text>
                  </LinearGradient>
                </View>

                {/* Image strip */}
                {attachmentsTop.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
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
                    <Icon name="time-outline" size={14} color={C.warn} />
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
                    <Icon name="checkmark-done-outline" size={14} color={C.ok} />
                  </View>
                  <Text style={st.infoText}>This ticket is closed. You can view history below.</Text>
                </LinearGradient>
              </View>
            )}

            {/* Conversation */}
            <View style={st.sectionTitleRow}>
              <Icon name="chatbubbles-outline" size={16} color={C.ink} />
              <Text style={st.sectionTitle}>Conversation</Text>
              <View style={st.threadCountBadge}>
                <Text style={st.threadCountText}>{thread.length}</Text>
              </View>
              <View style={st.sectionLine} />
            </View>
            <View style={{ paddingHorizontal: 16 }}>
              {thread.length === 0 ? (
                <View style={st.noMsgBox}>
                  <Icon name="chatbox-outline" size={28} color={C.muted} />
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
            <Icon name="images-outline" size={18} color={C.primary} />
          </TouchableOpacity>

          <View style={{ flex: 1, paddingRight: 48 }}>
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8 }}>
                {draftPhotos.map(p => (
                  <View key={p.uri} style={st.draftBox}>
                    <Image source={{ uri: p.uri }} style={st.draftImg} />
                    <TouchableOpacity onPress={() => removeDraft(p.uri)} style={st.draftDel}>
                      <Icon name="close" size={12} color="#fff" />
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
            style={{ position: 'absolute', right: 10, bottom: 10 }}
          >
            <LinearGradient
              colors={(!canChat || closed || (!text.trim() && draftPhotos.length === 0)) ? ['#E2E8F0', '#E2E8F0'] : [C.primary, C.primaryDark]}
              style={st.fabSend}
            >
              <Icon name="paper-plane" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete confirm */}
      <Modal visible={askDelete} transparent animationType="fade" onRequestClose={() => setAskDelete(false)}>
        <View style={st.overlay}>
          <View style={st.sheet}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <LinearGradient colors={['#F87171', '#DC2626']} style={st.sheetIcon}>
                <Icon name="trash" size={16} color="#fff" />
              </LinearGradient>
              <Text style={st.sheetTitle}>Delete ticket?</Text>
            </View>
            <Text style={st.sheetSub}>Only pending tickets can be deleted. This action cannot be undone.</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
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
            <Icon name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: viewer }} style={{ width: W * 0.92, height: W * 1.1, borderRadius: 16 }} resizeMode="contain" />
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
          <Icon name={meta.icon} size={12} color={meta.gradient[1]} />
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
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
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
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
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
          <Icon name="person" size={12} color="#fff" />
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hTitle: { color: '#fff', fontWeight: '900', fontSize: 22 },

  skelHero: { height: 120, backgroundColor: '#E9EEF5', borderRadius: R, marginBottom: 10 },
  skelLine: { height: 14, backgroundColor: '#E9EEF5', borderRadius: 8, marginBottom: 10 },
  skelCard: { height: 120, backgroundColor: '#E9EEF5', borderRadius: R },

  card: {
    backgroundColor: C.card,
    borderRadius: R,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardAccent: { height: 4 },
  cardInner: { padding: 14 },
  title: { color: C.text, fontWeight: '900', fontSize: 18 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 6, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: C.muted, fontSize: 12, fontWeight: '500' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeTxt: { fontWeight: '800', fontSize: 11, color: '#fff' },

  thumb: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#EEF2F7' },

  infoBanner: { marginHorizontal: 16, marginTop: 10 },
  infoBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  infoBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1, color: C.text, fontSize: 13, lineHeight: 18 },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: { color: C.ink, fontWeight: '900', fontSize: 16 },
  threadCountBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  threadCountText: { fontSize: 11, fontWeight: '800', color: C.primary },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },

  noMsgBox: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  noMsgText: { color: C.muted, fontSize: 13 },

  // Conversation
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 6 },
  avatarSm: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
  avatarImg: { width: 24, height: 24, borderRadius: 12 },
  avatarSmOwner: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FCA5A5', alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },

  bubble: { maxWidth: W * 0.76, borderRadius: 16, padding: 12 },
  bubbleOwner: { borderTopRightRadius: 6 },
  bubbleSupport: { backgroundColor: C.card, borderWidth: 1, borderColor: '#EEF2F7', borderTopLeftRadius: 6 },
  msgText: { color: C.text, fontSize: 14, lineHeight: 20 },
  msgTime: { marginTop: 6, fontSize: 11, color: '#94A3B8' },
  msgImgBox: { width: 96, height: 96, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  msgImg: { width: '100%', height: '100%' },

  sysRow: { alignItems: 'center', marginVertical: 10, paddingHorizontal: 16 },
  sysBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  sysTxt: { fontWeight: '800', fontSize: 12 },
  sysNote: { color: C.muted, marginTop: 6, textAlign: 'center' },
  sysTime: { color: '#94A3B8', fontSize: 11, marginTop: 6 },

  // Composer
  composerWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: C.card,
    borderTopWidth: 1, borderColor: '#EEF2F7',
    paddingHorizontal: 12, paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  composerCard: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 10,
    backgroundColor: C.card, borderRadius: 18,
    borderWidth: 1, borderColor: '#EEF2F7',
  },
  attachBtn: {
    width: 38, height: 38, borderRadius: 12,
    borderWidth: 1, borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  composerInput: {
    color: C.text, fontSize: 15, lineHeight: 20,
    minHeight: 20, maxHeight: 120, paddingTop: 4, paddingBottom: 4,
  },
  fabSend: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  draftBox: { width: 56, height: 56, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8 },
  draftImg: { width: '100%', height: '100%' },
  draftDel: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  sheet: { width: W * 0.86, backgroundColor: C.card, borderRadius: R, padding: 16, borderWidth: 1, borderColor: '#EEF2F7' },
  sheetIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sheetTitle: { color: C.ink, fontWeight: '900', fontSize: 18 },
  sheetSub: { color: C.muted, marginTop: 2, lineHeight: 18 },

  dangerBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  dangerTxt: { color: '#fff', fontWeight: '900' },
  outBtn: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  outTxt: { color: C.ink, fontWeight: '900' },

  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  viewerClose: { position: 'absolute', top: 18, right: 18, width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});
