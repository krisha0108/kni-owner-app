/**
 * ============================================================================
 * SUPPORT TICKET DETAIL SCREEN
 * ============================================================================
 * Was a full-screen Modal inside SupportCenter.js — moved to a real navigable
 * screen so push notifications ("Admin replied to your ticket") can deep-link
 * straight into the specific ticket's conversation instead of just the list.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, TextInput, Image, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import { api, IMAGE_BASE_URL, uploadFile } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';

import { scale, moderateScale } from '../utils/responsive';
import AppAlert from '../utils/AppAlert';

const C = {
  primary: '#EF3A3A',
  primaryDark: '#D42E2E',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  info: '#3B82F6',
};

const CATEGORY_CONFIG = {
  General:   { icon: 'help-circle', gradient: ['#6366F1', '#4F46E5'], lightBg: '#E0E7FF', color: '#4F46E5' },
  Equipment: { icon: 'hardware-chip', gradient: ['#F97316', '#EA580C'], lightBg: '#FFEDD5', color: '#EA580C' },
  Billing:   { icon: 'card', gradient: ['#10B981', '#059669'], lightBg: '#D1FAE5', color: '#059669' },
  Service:   { icon: 'construct', gradient: ['#3B82F6', '#1D4ED8'], lightBg: '#DBEAFE', color: '#2563EB' },
  Account:   { icon: 'person', gradient: ['#8B5CF6', '#6D28D9'], lightBg: '#EDE9FE', color: '#7C3AED' },
  Other:     { icon: 'ellipsis-horizontal', gradient: ['#94A3B8', '#64748B'], lightBg: '#E2E8F0', color: '#64748B' },
};

const STATUS_CONFIG = {
  PENDING:    { icon: 'time', label: 'Pending', bg: '#FEF3C7', color: '#D97706' },
  SEEN:       { icon: 'eye', label: 'Seen', bg: '#DBEAFE', color: '#2563EB' },
  ON_WORK:    { icon: 'construct', label: 'On Work', bg: '#E0E7FF', color: '#4F46E5' },
  COMPLETED:  { icon: 'checkmark-circle', label: 'Completed', bg: '#D1FAE5', color: '#059669' },
  REJECTED:   { icon: 'close-circle', label: 'Rejected', bg: '#FEE2E2', color: '#DC2626' },
  pending:    { icon: 'time', label: 'Pending', bg: '#FEF3C7', color: '#D97706' },
  seen:       { icon: 'eye', label: 'Seen', bg: '#DBEAFE', color: '#2563EB' },
  onwork:     { icon: 'construct', label: 'On Work', bg: '#E0E7FF', color: '#4F46E5' },
  completed:  { icon: 'checkmark-circle', label: 'Completed', bg: '#D1FAE5', color: '#059669' },
  rejected:   { icon: 'close-circle', label: 'Rejected', bg: '#FEE2E2', color: '#DC2626' },
};

const formatDateTime = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const formatTimeAgo = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toStorageUrl = (u) => {
  if (!u) return '';
  const s = String(u).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) && !/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(s)) return s;
  const m = s.match(/\/storage\/(.+)$/);
  const tail = m ? m[1] : s.replace(/^\/?storage\/?/, '');
  const base = IMAGE_BASE_URL.replace(/\/$/, '');
  return `${base}/${tail.replace(/^\/+/, '')}`;
};

const getStatus = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

/* ─── Skeleton ─── */
function SkeletonTicketDetail({ pulse }) {
  return (
    <View style={{ padding: scale(16) }}>
      <View style={st.detailCard}>
        <Animated.View style={[st.itemAccent, { backgroundColor: '#E2E8F0' }]} />
        <View style={st.detailCardBody}>
          <View style={st.itemHeaderRow}>
            <Animated.View style={[st.typeIconBox, { backgroundColor: '#E2E8F0', opacity: pulse }]} />
            <View style={st.itemHeaderInfo}>
              <Animated.View style={[st.skelLine, { width: '70%', opacity: pulse }]} />
              <View style={[st.itemMetaRow, { marginTop: scale(8) }]}>
                <Animated.View style={[st.skelChip, { width: scale(60), height: scale(18), opacity: pulse }]} />
                <Animated.View style={[st.skelMeta, { opacity: pulse }]} />
              </View>
            </View>
          </View>
          <Animated.View style={[st.skelLine, { width: '100%', marginTop: scale(16), opacity: pulse }]} />
          <Animated.View style={[st.skelLine, { width: '90%', marginTop: scale(8), opacity: pulse }]} />
          <Animated.View style={[st.skelLine, { width: '60%', marginTop: scale(8), opacity: pulse }]} />
          <View style={st.detailFooterRow}>
            <Animated.View style={[st.skelChip, { opacity: pulse }]} />
            <Animated.View style={[st.skelMeta, { opacity: pulse }]} />
          </View>
        </View>
      </View>

      <View style={[st.msgSectionHeader, { marginTop: scale(20) }]}>
        <Animated.View style={[st.skelLine, { width: scale(90), opacity: pulse }]} />
        <Animated.View style={[st.skelMeta, { width: scale(24), height: scale(20), borderRadius: scale(10), opacity: pulse }]} />
      </View>

      {[1, 2].map(i => (
        <View key={i} style={[st.threadMsg, i === 1 ? st.threadOwner : st.threadAdmin]}>
          <Animated.View style={[st.threadAccentLine, { backgroundColor: '#E2E8F0' }]} />
          <View style={st.threadInner}>
            <View style={st.threadHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                <Animated.View style={[st.threadAvatar, { backgroundColor: '#E2E8F0', opacity: pulse }]} />
                <Animated.View style={[st.skelLine, { width: scale(50), opacity: pulse }]} />
              </View>
              <Animated.View style={[st.skelMeta, { width: scale(36), height: scale(10), opacity: pulse }]} />
            </View>
            <Animated.View style={[st.skelLine, { width: '95%', marginTop: scale(4), opacity: pulse }]} />
            <Animated.View style={[st.skelLine, { width: '65%', marginTop: scale(6), opacity: pulse }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function SupportTicketDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { ticketId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [threads, setThreads] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyImageUri, setReplyImageUri] = useState('');
  const [isSending, setIsSending] = useState(false);

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const loadTicket = useCallback(async () => {
    if (!ticketId) { setLoading(false); return; }
    try {
      const response = await api.get(`/owner/support/${ticketId}`);
      if (response.data.ok) {
        setTicket(response.data.data);
        setThreads(response.data.data.threads || []);
      }
    } catch (e) {
      console.error('Fetch ticket detail error:', e);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useFocusEffect(useCallback(() => { loadTicket(); }, [loadTicket]));

  const pickReplyImage = async () => {
    try {
      const r = await launchImageLibrary({ mediaType: 'photo', quality: 0.85 });
      if (r?.assets?.[0]?.uri) setReplyImageUri(r.assets[0].uri);
    } catch (e) { console.error('Image pick error:', e); }
  };

  const handleSendMessage = async () => {
    if (!ticket || (!newMessage.trim() && !replyImageUri)) return;
    setIsSending(true);
    try {
      // The thread endpoint only accepts a JSON body with an imageUrl string,
      // not a raw file - upload the picked image first, then send its URL.
      let imageUrl;
      if (replyImageUri) {
        const uploadForm = new FormData();
        uploadForm.append('file', { uri: replyImageUri, type: 'image/jpeg', name: `reply_${Date.now()}.jpg` });
        uploadForm.append('folder', 'support-tickets');
        const { data } = await uploadFile(uploadForm);
        if (data.ok && data.url) imageUrl = data.url;
      }
      const res = await api.post(`/owner/support/${ticket.id}/threads`, {
        message: newMessage || 'Image attached',
        imageUrl,
      });
      if (res.data.ok) { setThreads([...threads, res.data.data]); setNewMessage(''); setReplyImageUri(''); }
    } catch (e) {
      console.error('Send message error:', e);
      AppAlert.alert('Error', 'Failed to send message');
    } finally { setIsSending(false); }
  };

  const canReply = ticket &&
    ticket.status !== 'COMPLETED' && ticket.status !== 'REJECTED' &&
    ticket.status !== 'completed' && ticket.status !== 'rejected';

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('SupportCenter'));

  if (loading) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar translucent barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.header, { paddingTop: insets.top + scale(10) }]}>
          <View style={st.headerBlobA} pointerEvents="none" />
          <View style={st.headerBlobB} pointerEvents="none" />
          <TouchableOpacity onPress={goBack} style={st.backBtn}>
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Ticket Details</Text>
            <View style={st.headerStatusPill}>
              <Animated.View style={{ width: scale(30), height: scale(9), borderRadius: scale(5), backgroundColor: 'rgba(255,255,255,0.6)', opacity: pulse }} />
            </View>
          </View>
          <View style={{ width: scale(38) }} />
        </LinearGradient>
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonTicketDetail pulse={pulse} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar translucent barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.header, { paddingTop: insets.top + scale(10) }]}>
          <View style={st.headerBlobA} pointerEvents="none" />
          <View style={st.headerBlobB} pointerEvents="none" />
          <TouchableOpacity onPress={goBack} style={st.backBtn}>
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Ticket Details</Text>
          <View style={{ width: scale(38) }} />
        </LinearGradient>
        <View style={st.loadingBox}>
          <Icon name="alert-circle-outline" size={scale(48)} color={C.muted} />
          <Text style={{ fontSize: moderateScale(14), color: C.muted, marginTop: scale(10) }}>Ticket not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dCat = CATEGORY_CONFIG[ticket.category] || CATEGORY_CONFIG.General;
  const dSt = getStatus(ticket.status);

  return (
    <SafeAreaView style={st.container} edges={['left', 'right']}>
      <StatusBar translucent barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.header, { paddingTop: insets.top + scale(10) }]}>
        <View style={st.headerBlobA} pointerEvents="none" />
        <View style={st.headerBlobB} pointerEvents="none" />
        <TouchableOpacity onPress={goBack} style={st.backBtn}>
          <Icon name="chevron-back" size={scale(20)} color="#fff" />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Ticket Details</Text>
          <View style={st.headerStatusPill}>
            <Text style={st.headerStatusText}>{dSt.label}</Text>
          </View>
        </View>
        <View style={{ width: scale(38) }} />
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: scale(16), paddingBottom: canReply ? 90 : 24 }} showsVerticalScrollIndicator={false}>
        {/* Ticket Info Card */}
        <View style={st.detailCard}>
          <LinearGradient colors={dCat.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.itemAccent} />
          <View style={st.detailCardBody}>
            <View style={st.itemHeaderRow}>
              <LinearGradient colors={dCat.gradient} style={st.typeIconBox}>
                <Icon name={dCat.icon} size={scale(18)} color="#fff" />
              </LinearGradient>
              <View style={st.itemHeaderInfo}>
                <Text style={st.itemTitle}>{ticket.title}</Text>
                <View style={st.itemMetaRow}>
                  <View style={[st.typePill, { backgroundColor: dCat.lightBg }]}>
                    <Text style={[st.typePillText, { color: dCat.color }]}>{ticket.category}</Text>
                  </View>
                  <Text style={st.timeAgoText}>{formatTimeAgo(ticket.createdAt)}</Text>
                </View>
              </View>
            </View>

            {ticket.equipmentName ? (
              <View style={[st.equipmentRow, { marginTop: scale(12) }]}>
                <Icon name="hardware-chip-outline" size={scale(13)} color={C.muted} />
                <Text style={st.equipmentText}>{ticket.equipmentName}</Text>
              </View>
            ) : null}

            <Text style={st.detailDesc}>{ticket.description}</Text>

            {ticket.photoUrl ? (
              <View style={st.detailImgWrap}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4), marginBottom: scale(8) }}>
                  <Icon name="image-outline" size={scale(13)} color={C.muted} />
                  <Text style={{ fontSize: moderateScale(12), color: C.muted, fontWeight: '600' }}>Attachment</Text>
                </View>
                <Image source={{ uri: toStorageUrl(ticket.photoUrl) }} style={st.detailImg} resizeMode="cover" />
              </View>
            ) : null}

            <View style={st.detailFooterRow}>
              <View style={[st.statusChip, { backgroundColor: dSt.bg }]}>
                <Icon name={dSt.icon} size={scale(13)} color={dSt.color} />
                <Text style={[st.statusChipText, { color: dSt.color }]}>{dSt.label}</Text>
              </View>
              <Text style={st.footerMeta}>#{ticket.ticketNumber ?? ticket.id?.slice(0, 8)}</Text>
            </View>
          </View>
        </View>

        {/* Messages Section */}
        <View style={st.msgSectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
            <Icon name="chatbubbles" size={scale(16)} color={C.ink} />
            <Text style={st.msgSectionTitle}>Messages</Text>
          </View>
          <View style={st.msgCountPill}>
            <Text style={st.msgCountText}>{threads.length}</Text>
          </View>
        </View>

        {threads.length === 0 ? (
          <View style={st.noMsgBox}>
            <LinearGradient colors={['#F1F5F9', '#E2E8F0']} style={st.noMsgCircle}>
              <Icon name="chatbox-outline" size={scale(28)} color={C.muted} />
            </LinearGradient>
            <Text style={st.noMsgText}>No messages yet</Text>
          </View>
        ) : (
          threads.map((thread) => (
            <View
              key={thread.id}
              style={[st.threadMsg, thread.isAdmin ? st.threadAdmin : st.threadOwner]}
            >
              {thread.isAdmin ? (
                <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={st.threadAccentLine} />
              ) : (
                <LinearGradient colors={[C.primary, C.primaryDark]} style={st.threadAccentLine} />
              )}
              <View style={st.threadInner}>
                <View style={st.threadHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                    <LinearGradient
                      colors={thread.isAdmin ? ['#3B82F6', '#1D4ED8'] : [C.primary, C.primaryDark]}
                      style={st.threadAvatar}
                    >
                      <Icon name={thread.isAdmin ? 'headset' : 'person'} size={scale(10)} color="#fff" />
                    </LinearGradient>
                    <Text style={st.threadAuthor}>
                      {thread.user?.name || (thread.isAdmin ? 'Support' : 'You')}
                    </Text>
                    {thread.isAdmin && (
                      <LinearGradient colors={[C.info, '#1D4ED8']} style={st.supportBadge}>
                        <Text style={st.supportBadgeText}>Support</Text>
                      </LinearGradient>
                    )}
                  </View>
                  <Text style={st.threadTime}>{formatDateTime(thread.createdAt)}</Text>
                </View>
                <Text style={st.threadText}>{thread.message}</Text>
                {thread.imageUrl ? (
                  <Image source={{ uri: toStorageUrl(thread.imageUrl) }} style={st.threadImage} resizeMode="cover" />
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Reply Bar */}
      {canReply && (
        <View style={st.replyBar}>
          {replyImageUri ? (
            <View style={st.replyImgPreview}>
              <Image source={{ uri: replyImageUri }} style={st.replyImg} />
              <TouchableOpacity style={st.removeReplyBtn} onPress={() => setReplyImageUri('')}>
                <Icon name="close" size={scale(10)} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={st.replyInputRow}>
            <TextInput
              style={st.replyInput}
              placeholder="Type your message..."
              placeholderTextColor={C.muted}
              value={newMessage}
              onChangeText={setNewMessage}
            />
            <TouchableOpacity style={st.attachBtn} onPress={pickReplyImage}>
              <Icon name="image-outline" size={scale(18)} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={isSending || (!newMessage.trim() && !replyImageUri)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={(!newMessage.trim() && !replyImageUri) ? ['#E2E8F0', '#E2E8F0'] : [C.primary, C.primaryDark]}
                style={st.sendBtn}
              >
                {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={scale(16)} color="#fff" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
    overflow: 'hidden',
  },
  headerBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  headerBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  backBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(11),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: scale(7) },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '900', color: '#fff' },
  headerStatusPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(3),
    borderRadius: scale(10),
    marginTop: scale(2),
    alignSelf: 'center',
  },
  headerStatusText: { fontSize: moderateScale(11), fontWeight: '700', color: '#fff' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ─── Skeleton ───
  skelLine: { height: scale(12), backgroundColor: '#E2E8F0', borderRadius: scale(6) },
  skelChip: { width: scale(80), height: scale(22), borderRadius: scale(20), backgroundColor: '#E2E8F0' },
  skelMeta: { width: scale(50), height: scale(14), borderRadius: scale(6), backgroundColor: '#E2E8F0' },

  // Ticket Info Card
  detailCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
  },
  itemAccent: { height: scale(3) },
  detailCardBody: { padding: scale(14) },
  itemHeaderRow: { flexDirection: 'row', gap: scale(12), alignItems: 'flex-start' },
  typeIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemHeaderInfo: { flex: 1 },
  itemTitle: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink, marginBottom: scale(4) },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  typePill: { paddingHorizontal: scale(8), paddingVertical: scale(2), borderRadius: scale(6) },
  typePillText: { fontSize: moderateScale(10), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  timeAgoText: { fontSize: moderateScale(11), color: C.muted },
  equipmentRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingLeft: scale(52) },
  equipmentText: { fontSize: moderateScale(13), color: C.muted },
  detailDesc: {
    fontSize: moderateScale(14),
    color: C.text,
    lineHeight: moderateScale(21),
    marginTop: scale(12),
    paddingLeft: scale(52),
  },
  detailImgWrap: { marginTop: scale(14), paddingLeft: scale(52) },
  detailImg: { width: '100%', height: scale(160), borderRadius: scale(12) },
  detailFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scale(14),
    paddingLeft: scale(52),
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(8),
  },
  statusChipText: { fontSize: moderateScale(12), fontWeight: '700' },
  footerMeta: { fontSize: moderateScale(11), color: C.muted, fontFamily: 'monospace' },

  // Messages
  msgSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(14),
  },
  msgSectionTitle: { fontSize: moderateScale(15), fontWeight: '800', color: C.ink },
  msgCountPill: { backgroundColor: '#FEF2F2', paddingHorizontal: scale(10), paddingVertical: scale(3), borderRadius: scale(10) },
  msgCountText: { fontSize: moderateScale(12), fontWeight: '800', color: C.primary },
  noMsgBox: { alignItems: 'center', paddingVertical: scale(30) },
  noMsgCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  noMsgText: { fontSize: moderateScale(13), color: C.muted },

  // Thread Messages
  threadMsg: { borderRadius: scale(14), marginBottom: scale(10), overflow: 'hidden', borderWidth: 1 },
  threadAdmin: { backgroundColor: '#F0F7FF', borderColor: '#DBEAFE', marginLeft: scale(20) },
  threadOwner: { backgroundColor: '#FEF8F8', borderColor: '#FECACA', marginRight: scale(20) },
  threadAccentLine: { height: scale(3) },
  threadInner: { padding: scale(12) },
  threadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(8) },
  threadAvatar: { width: scale(22), height: scale(22), borderRadius: scale(11), alignItems: 'center', justifyContent: 'center' },
  threadAuthor: { fontSize: moderateScale(12), fontWeight: '700', color: C.ink },
  supportBadge: { paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(6) },
  supportBadgeText: { fontSize: moderateScale(9), fontWeight: '800', color: '#fff' },
  threadTime: { fontSize: moderateScale(10), color: C.muted },
  threadText: { fontSize: moderateScale(13), color: C.text, lineHeight: moderateScale(20) },
  threadImage: { width: '100%', height: scale(120), borderRadius: scale(10), marginTop: scale(8) },

  // Reply Bar
  replyBar: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    backgroundColor: C.card,
  },
  replyImgPreview: { position: 'relative', alignSelf: 'flex-start', marginBottom: scale(8) },
  replyImg: { width: scale(56), height: scale(56), borderRadius: scale(10) },
  removeReplyBtn: {
    position: 'absolute',
    top: scale(-5),
    right: scale(-5),
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyInputRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  replyInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    fontSize: moderateScale(14),
    color: C.text,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  attachBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: { width: scale(38), height: scale(38), borderRadius: scale(19), alignItems: 'center', justifyContent: 'center' },
});
