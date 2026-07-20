/**
 * ============================================================================
 * AMC CONTRACT DETAIL SCREEN - PREMIUM DESIGN
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  StatusBar, Share, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, downloadAuthenticatedFile } from '../api/client';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import { scale, moderateScale } from '../utils/responsive';
import useKeyboardHeight from '../utils/useKeyboardHeight';
import { invalidate } from '../utils/focusCache';
import AppAlert from '../utils/AppAlert';

const C = {
  primary: '#EF3A3A', primaryDark: '#DC2626', ink: '#1D2254', text: '#334155',
  muted: '#94A3B8', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0',
  ok: '#10B981', okLight: '#D1FAE5', warn: '#F59E0B', warnLight: '#FEF3C7',
  danger: '#EF4444', dangerLight: '#FEE2E2', info: '#3B82F6', infoLight: '#DBEAFE',
  purple: '#7C3AED', purpleLight: '#F3E8FF',
};

const CONTRACT_STATUS = {
  ACTIVE:    { bg: '#D1FAE5', color: '#059669', icon: 'shield-checkmark', label: 'Active' },
  EXPIRED:   { bg: '#FEF3C7', color: '#D97706', icon: 'time-outline', label: 'Expired' },
  CANCELLED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle', label: 'Cancelled' },
  RENEWED:   { bg: '#DBEAFE', color: '#2563EB', icon: 'refresh', label: 'Renewed' },
};

const VISIT_STATUS = {
  SCHEDULED:   { bg: '#DBEAFE', color: '#2563EB', label: 'Scheduled' },
  ASSIGNED:    { bg: '#E0E7FF', color: '#4F46E5', label: 'Assigned' },
  IN_PROGRESS: { bg: '#FEF3C7', color: '#D97706', label: 'In Progress' },
  COMPLETED:   { bg: '#D1FAE5', color: '#059669', label: 'Completed' },
  MISSED:      { bg: '#FEE2E2', color: '#DC2626', label: 'Missed' },
  RESCHEDULED: { bg: '#FEF3C7', color: '#D97706', label: 'Rescheduled' },
  CANCELLED:   { bg: '#FEE2E2', color: '#DC2626', label: 'Cancelled' },
};

const BREAKDOWN_STATUS = {
  REQUESTED:   { bg: '#FEF3C7', color: '#D97706', label: 'Requested' },
  ASSIGNED:    { bg: '#DBEAFE', color: '#2563EB', label: 'Assigned' },
  IN_PROGRESS: { bg: '#FEF3C7', color: '#D97706', label: 'In Progress' },
  RESOLVED:    { bg: '#D1FAE5', color: '#059669', label: 'Resolved' },
  CHARGEABLE:  { bg: '#FEE2E2', color: '#DC2626', label: 'Chargeable' },
};

const URGENCY_OPTIONS = [
  { key: 'LOW', label: 'Low', color: '#059669' },
  { key: 'MEDIUM', label: 'Medium', color: '#D97706' },
  { key: 'HIGH', label: 'High', color: '#DC2626' },
];

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const formatPrice = (amount) => '₹' + (parseFloat(amount) || 0).toLocaleString('en-IN');

export default function AMCContractDetailScreen({ navigation, route }) {
  const { contractId } = route.params || {};

  const keyboardHeight = useKeyboardHeight();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState(false);

  // Visit schedule expand toggle
  const [showAllVisits, setShowAllVisits] = useState(false);

  // Breakdown modal state
  const [breakdownModal, setBreakdownModal] = useState(false);
  const [breakdownEquipment, setBreakdownEquipment] = useState('');
  const [breakdownDescription, setBreakdownDescription] = useState('');
  const [breakdownUrgency, setBreakdownUrgency] = useState('MEDIUM');
  const [breakdownSubmitting, setBreakdownSubmitting] = useState(false);

  const loadContract = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/owner/amc-contracts/${contractId}`);
      if (response.data.ok) {
        setContract(response.data.data);
      }
    } catch (error) {
      console.error('Error loading contract:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [contractId]);

  useEffect(() => {
    if (contractId) loadContract();
  }, [contractId, loadContract]);

  const onRefresh = () => { setRefreshing(true); loadContract(); };

  const handleSubmitBreakdown = async () => {
    if (!breakdownEquipment.trim()) {
      AppAlert.alert('Error', 'Please enter equipment name');
      return;
    }
    if (!breakdownDescription.trim()) {
      AppAlert.alert('Error', 'Please describe the problem');
      return;
    }

    setBreakdownSubmitting(true);
    try {
      const res = await api.post('/owner/amc-breakdown', {
        contractId,
        equipmentName: breakdownEquipment,
        problemDesc: breakdownDescription,
        urgency: breakdownUrgency,
      });
      const msg = res.data?.data?.isCoveredByAMC
        ? 'Breakdown reported - covered by AMC!'
        : 'Breakdown reported - this may be chargeable (free visits exhausted)';
      AppAlert.alert('Success', msg);
      setBreakdownModal(false);
      setBreakdownEquipment('');
      setBreakdownDescription('');
      setBreakdownUrgency('MEDIUM');
      loadContract();
    } catch (e) {
      AppAlert.alert('Error', e.response?.data?.error || 'Failed to submit breakdown request');
    } finally {
      setBreakdownSubmitting(false);
    }
  };

  const handleDownloadDocument = async () => {
    if (downloadingDoc) return;
    setDownloadingDoc(true);
    try {
      const path = await downloadAuthenticatedFile(
        `/owner/amc-contracts/${contractId}/document`,
        `amc-contract-${contractId}.pdf`
      );
      await Share.share({ url: Platform.OS === 'ios' ? path : `file://${path}`, title: 'AMC Contract Document' });
    } catch (error) {
      console.error('Download AMC document error:', error);
      AppAlert.alert('Error', 'Failed to download the contract document');
    } finally {
      setDownloadingDoc(false);
    }
  };

  const handleRenew = () => {
    AppAlert.alert('Renew Contract', 'This will create a renewal request. Admin will schedule a re-survey. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Renew', onPress: async () => {
          try {
            const res = await api.post(`/owner/amc-contracts/${contractId}/renew`);
            invalidate(`AMCRequestsList-${contract.restaurant?.id}`);
            if (res.data?.ok && res.data?.data?.id) {
              AppAlert.alert('Success', 'Renewal request submitted! You can track it in AMC Requests.');
              navigation.navigate('AMCRequestDetail', { requestId: res.data.data.id });
            } else {
              AppAlert.alert('Success', 'Contract renewal request submitted!');
              loadContract();
            }
          } catch (e) {
            AppAlert.alert('Error', e.response?.data?.error || 'Failed to renew contract');
          }
        },
      },
    ]);
  };

  // Loading
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#059669" />
        <LinearGradient colors={['#059669', '#047857']} style={styles.heroHeader}>
          <View style={styles.heroContent}>
            <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>Contract Details</Text>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
              <Icon name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.ok} />
        </View>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      </SafeAreaView>
    );
  }

  if (!contract) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#059669" />
        <LinearGradient colors={['#059669', '#047857']} style={styles.heroHeader}>
          <View style={styles.heroContent}>
            <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>Contract Details</Text>
            <View style={{ width: scale(40) }} />
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={48} color={C.muted} />
          <Text style={styles.emptyTitle}>Contract Not Found</Text>
        </View>
        <KniBottomNav navigation={navigation} />
      </SafeAreaView>
    );
  }

  const statusConfig = CONTRACT_STATUS[contract.status] || CONTRACT_STATUS.ACTIVE;
  const contractNum = contract.contractNumber || `AMC-${contract.id.slice(0, 6).toUpperCase()}`;

  // Calculate visits from scheduledVisits array (same as web)
  const scheduledVisits = contract.scheduledVisits || [];
  const completedVisits = scheduledVisits.filter(v => v.status === 'COMPLETED').length;
  const totalPreventive = scheduledVisits.filter(v => v.visitType === 'PREVENTIVE').length;
  const progress = totalPreventive > 0 ? completedVisits / totalPreventive : 0;

  // Breakdowns from direct fields
  const breakdownsUsed = contract.breakdownVisitsUsed || 0;
  const breakdownsTotal = contract.freeBreakdownVisits || 0;
  const breakdownRequests = contract.breakdownRequests || [];

  // Days remaining
  const daysRemaining = contract.endDate ? Math.max(0, Math.ceil((new Date(contract.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />

      {/* Hero */}
      <LinearGradient colors={['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroHeader}>
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>{contractNum}</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.heroStatusRow}>
          <View style={[styles.heroBadge, { backgroundColor: statusConfig.bg }]}>
            <Icon name={statusConfig.icon} size={18} color={statusConfig.color} />
            <Text style={[styles.heroBadgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          <Text style={styles.heroRestName}>{contract.restaurant?.name || ''}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.ok]} />}
      >
        {/* Stats Grid - 2x2 */}
        <View style={styles.statsGrid}>
          <View style={styles.statsGridRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: C.ok + '15' }]}>
                <Icon name="checkmark-done" size={18} color={C.ok} />
              </View>
              <View style={styles.statTextWrap}>
                <Text style={[styles.statValue, { color: C.ok }]}>{completedVisits}/{totalPreventive}</Text>
                <Text style={styles.statLabel}>Visits Done</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: C.warn + '15' }]}>
                <Icon name="construct" size={18} color={C.warn} />
              </View>
              <View style={styles.statTextWrap}>
                <Text style={[styles.statValue, { color: C.warn }]}>{breakdownsUsed}/{breakdownsTotal}</Text>
                <Text style={styles.statLabel}>Breakdowns</Text>
              </View>
            </View>
          </View>
          <View style={styles.statsGridRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: C.purple + '15' }]}>
                <Icon name="card" size={18} color={C.purple} />
              </View>
              <View style={styles.statTextWrap}>
                <Text style={[styles.statValue, { color: C.purple }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatPrice(contract.amount)}</Text>
                <Text style={styles.statLabel}>Contract Price</Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: (daysRemaining < 30 ? C.danger : C.ok) + '15' }]}>
                <Icon name="time" size={18} color={daysRemaining < 30 ? C.danger : C.ok} />
              </View>
              <View style={styles.statTextWrap}>
                <Text style={[styles.statValue, { color: daysRemaining < 30 ? C.danger : C.ok }]}>{daysRemaining}</Text>
                <Text style={styles.statLabel}>Days Left</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.info, flex: 0, paddingHorizontal: scale(14) }]}
            onPress={handleDownloadDocument}
            disabled={downloadingDoc}
          >
            {downloadingDoc ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="download-outline" size={18} color="#fff" />
            )}
          </TouchableOpacity>
          {contract.status === 'ACTIVE' && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => setBreakdownModal(true)}>
              <Icon name="warning-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Report Breakdown</Text>
            </TouchableOpacity>
          )}
          {(contract.status === 'ACTIVE' || contract.status === 'EXPIRED') && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.purple }]} onPress={handleRenew}>
              <Icon name="refresh" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Renew</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contract Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: C.okLight }]}>
              <Icon name="document-text-outline" size={20} color={C.ok} />
            </View>
            <Text style={styles.cardTitle}>Contract Details</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Start Date</Text>
              <Text style={styles.detailValue}>{formatDate(contract.startDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>End Date</Text>
              <Text style={styles.detailValue}>{formatDate(contract.endDate)}</Text>
            </View>
            {contract.proposal?.responseTimeSLA && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Response SLA</Text>
                <Text style={styles.detailValue}>{contract.proposal.responseTimeSLA}</Text>
              </View>
            )}
            {contract.proposal?.resolutionTimeSLA && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Resolution SLA</Text>
                <Text style={styles.detailValue}>{contract.proposal.resolutionTimeSLA}</Text>
              </View>
            )}
            {contract.proposal?.sparePartsPolicy && (
              <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <Text style={styles.detailLabel}>Spare Parts</Text>
                <Text style={[styles.detailValue, { textAlign: 'left', marginTop: scale(4) }]}>{contract.proposal.sparePartsPolicy}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Visit Progress Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: C.infoLight }]}>
              <Icon name="analytics-outline" size={20} color={C.info} />
            </View>
            <Text style={styles.cardTitle}>Visit Progress</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.progressCenter}>
              <Text style={styles.progressBig}>{completedVisits}</Text>
              <Text style={styles.progressSlash}>/</Text>
              <Text style={styles.progressTotal}>{totalPreventive}</Text>
            </View>
            <Text style={styles.progressSubtext}>preventive visits completed</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>

        {/* Visit Schedule - Compact with expand toggle */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: C.infoLight }]}>
              <Icon name="calendar" size={20} color={C.info} />
            </View>
            <Text style={styles.cardTitle}>Visit Schedule</Text>
            <View style={[styles.visitCountBadge, { backgroundColor: C.infoLight }]}>
              <Text style={{ fontSize: moderateScale(12), fontWeight: '700', color: C.info }}>{scheduledVisits.length}</Text>
            </View>
          </View>
          {scheduledVisits.length > 0 ? (
            <>
              {(showAllVisits ? scheduledVisits : scheduledVisits.slice(0, 3)).map((visit) => {
                const vs = VISIT_STATUS[visit.status] || VISIT_STATUS.SCHEDULED;
                return (
                  <View key={visit.id} style={styles.visitRow}>
                    <View style={[styles.visitDot, { backgroundColor: vs.color }]} />
                    <View style={styles.visitInfo}>
                      <Text style={styles.visitTitle}>
                        {visit.visitType === 'BREAKDOWN' ? 'Breakdown' : `Visit #${visit.visitNumber}`}
                      </Text>
                      <Text style={styles.visitDate}>{formatDate(visit.scheduledDate)}</Text>
                      {visit.engineer?.name && (
                        <Text style={styles.visitEngineer}>{visit.engineer.name}</Text>
                      )}
                    </View>
                    <View style={[styles.visitStatusBadge, { backgroundColor: vs.bg }]}>
                      <Text style={[styles.visitStatusText, { color: vs.color }]}>{vs.label}</Text>
                    </View>
                  </View>
                );
              })}
              {scheduledVisits.length > 3 && (
                <TouchableOpacity
                  style={styles.showMoreBtn}
                  onPress={() => setShowAllVisits(!showAllVisits)}
                  activeOpacity={0.7}
                >
                  <Icon name={showAllVisits ? 'chevron-up' : 'chevron-down'} size={18} color={C.info} />
                  <Text style={styles.showMoreText}>
                    {showAllVisits ? 'Show Less' : `Show All ${scheduledVisits.length} Visits`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.noVisits}>
              <Icon name="calendar-outline" size={32} color={C.muted} />
              <Text style={styles.noVisitsText}>No visits scheduled yet</Text>
            </View>
          )}
        </View>

        {/* Breakdown History */}
        {breakdownRequests.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: C.warnLight }]}>
                <Icon name="construct-outline" size={20} color={C.warn} />
              </View>
              <Text style={styles.cardTitle}>Breakdown History</Text>
            </View>
            {breakdownRequests.map((bd) => {
              const bs = BREAKDOWN_STATUS[bd.status] || BREAKDOWN_STATUS.REQUESTED;
              return (
                <View key={bd.id} style={styles.visitRow}>
                  <View style={[styles.visitDot, { backgroundColor: bs.color }]} />
                  <View style={styles.visitInfo}>
                    <Text style={styles.visitTitle}>{bd.equipmentName}</Text>
                    <Text style={styles.visitDate} numberOfLines={2}>{bd.problemDesc}</Text>
                    <View style={{ flexDirection: 'row', gap: scale(6), marginTop: scale(4) }}>
                      <View style={[styles.miniTag, { backgroundColor: bd.urgency === 'HIGH' ? C.dangerLight : bd.urgency === 'LOW' ? C.okLight : C.warnLight }]}>
                        <Text style={{ fontSize: moderateScale(10), fontWeight: '600', color: bd.urgency === 'HIGH' ? C.danger : bd.urgency === 'LOW' ? C.ok : C.warn }}>{bd.urgency}</Text>
                      </View>
                      <View style={[styles.miniTag, { backgroundColor: bd.isCoveredByAMC ? C.okLight : C.dangerLight }]}>
                        <Text style={{ fontSize: moderateScale(10), fontWeight: '600', color: bd.isCoveredByAMC ? C.ok : C.danger }}>{bd.isCoveredByAMC ? 'Covered' : 'Chargeable'}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.visitStatusBadge, { backgroundColor: bs.bg }]}>
                    <Text style={[styles.visitStatusText, { color: bs.color }]}>{bs.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Breakdowns Counter */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: C.warnLight }]}>
              <Icon name="warning-outline" size={20} color={C.warn} />
            </View>
            <Text style={styles.cardTitle}>Free Breakdowns</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownLabel}>Used</Text>
              <Text style={styles.breakdownCount}>{breakdownsUsed} / {breakdownsTotal}</Text>
            </View>
            <View style={styles.breakdownBarBg}>
              <View style={[styles.breakdownBarFill, {
                width: `${breakdownsTotal ? Math.min((breakdownsUsed / breakdownsTotal) * 100, 100) : 0}%`,
                backgroundColor: breakdownsUsed >= breakdownsTotal ? C.danger : C.warn,
              }]} />
            </View>
            {breakdownsUsed >= breakdownsTotal && (
              <Text style={{ color: C.danger, fontSize: moderateScale(12), marginTop: scale(4) }}>
                Free breakdowns exhausted. Additional breakdowns will be chargeable.
              </Text>
            )}
          </View>
        </View>

        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* Breakdown Modal - Full screen (not transparent) per MEMORY.md */}
      <Modal visible={breakdownModal} animationType="slide" onRequestClose={() => setBreakdownModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setBreakdownModal(false)} style={styles.modalCloseBtn}>
              <Icon name="close" size={24} color={C.ink} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Report Breakdown</Text>
            <View style={{ width: scale(40) }} />
          </View>

          <ScrollView
            style={{ flex: 1, padding: scale(16) }}
            contentContainerStyle={{ paddingBottom: scale(40) + keyboardHeight }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.noteBox, { backgroundColor: C.infoLight, marginBottom: scale(20) }]}>
              <Text style={{ color: C.info, fontSize: moderateScale(13) }}>
                Free breakdowns: {breakdownsUsed}/{breakdownsTotal} used.
                {breakdownsUsed >= breakdownsTotal ? ' This breakdown will be chargeable.' : ''}
              </Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Equipment Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g., Commercial Burner"
                placeholderTextColor={C.muted}
                value={breakdownEquipment}
                onChangeText={setBreakdownEquipment}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Problem Description *</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                placeholder="Describe the issue..."
                placeholderTextColor={C.muted}
                value={breakdownDescription}
                onChangeText={setBreakdownDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Urgency</Text>
              <View style={styles.urgencyRow}>
                {URGENCY_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.urgencyChip, breakdownUrgency === opt.key && { backgroundColor: opt.color, borderColor: opt.color }]}
                    onPress={() => setBreakdownUrgency(opt.key)}
                  >
                    <Text style={[styles.urgencyText, breakdownUrgency === opt.key && { color: '#fff' }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBreakdownBtn, breakdownSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmitBreakdown}
              disabled={breakdownSubmitting}
            >
              {breakdownSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="send-outline" size={20} color="#fff" />
                  <Text style={styles.submitBreakdownText}>Submit Breakdown Report</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: scale(40) }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Hero
  heroHeader: { paddingBottom: scale(20), borderBottomLeftRadius: scale(24), borderBottomRightRadius: scale(24) },
  heroContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(12),
  },
  backBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#fff', letterSpacing: 1 },
  menuBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  heroStatusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16),
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    paddingHorizontal: scale(14), paddingVertical: scale(8), borderRadius: scale(20),
  },
  heroBadgeText: { fontSize: moderateScale(13), fontWeight: '600' },
  heroRestName: { fontSize: moderateScale(13), color: 'rgba(255,255,255,0.8)' },

  // Stats Grid 2x2
  statsGrid: { gap: scale(10), marginBottom: scale(16) },
  statsGridRow: { flexDirection: 'row', gap: scale(10) },
  statCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: scale(10),
    backgroundColor: C.card, borderRadius: scale(14), padding: scale(14),
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIconCircle: {
    width: scale(36), height: scale(36), borderRadius: scale(18),
    alignItems: 'center', justifyContent: 'center',
  },
  statTextWrap: { flex: 1 },
  statValue: { fontSize: moderateScale(16), fontWeight: '800', color: C.ink },
  statLabel: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(1) },

  // Actions Row
  actionsRow: { flexDirection: 'row', gap: scale(10), marginBottom: scale(16) },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6),
    backgroundColor: C.warn, paddingVertical: scale(12), borderRadius: scale(12),
  },
  actionBtnText: { fontSize: moderateScale(13), fontWeight: '700', color: '#fff' },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: scale(16) },

  // Loading & Empty
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(32) },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginTop: scale(12) },

  // Cards
  card: {
    backgroundColor: C.card, borderRadius: scale(16), marginBottom: scale(16), overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: scale(16),
    borderBottomWidth: 1, borderBottomColor: C.border, gap: scale(12),
  },
  cardIconBox: {
    width: scale(40), height: scale(40), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink, flex: 1 },
  cardSubtitle: { fontSize: moderateScale(12), color: C.muted },
  cardBody: { padding: scale(16) },

  // Details
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: scale(8), borderBottomWidth: 1, borderBottomColor: C.border,
  },
  detailLabel: { fontSize: moderateScale(13), color: C.muted },
  detailValue: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink, flex: 1, textAlign: 'right' },

  // Progress
  progressCenter: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: scale(4) },
  progressBig: { fontSize: moderateScale(36), fontWeight: '800', color: C.ok },
  progressSlash: { fontSize: moderateScale(20), color: C.muted, marginHorizontal: scale(4) },
  progressTotal: { fontSize: moderateScale(20), fontWeight: '600', color: C.muted },
  progressSubtext: { textAlign: 'center', fontSize: moderateScale(13), color: C.muted, marginBottom: scale(16) },
  progressBarBg: {
    height: scale(10), backgroundColor: C.border, borderRadius: scale(5), overflow: 'hidden', marginBottom: scale(8),
  },
  progressBarFill: { height: scale(10), backgroundColor: C.ok, borderRadius: scale(5) },
  progressPercent: { textAlign: 'center', fontSize: moderateScale(13), fontWeight: '700', color: C.ok },

  // Visits
  visitRow: {
    flexDirection: 'row', alignItems: 'center', padding: scale(14),
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  visitDot: { width: scale(10), height: scale(10), borderRadius: scale(5) },
  visitInfo: { flex: 1, marginLeft: scale(12) },
  visitTitle: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  visitDate: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  visitEngineer: { fontSize: moderateScale(12), color: C.purple, marginTop: scale(2) },
  visitStatusBadge: { paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(10) },
  visitStatusText: { fontSize: moderateScale(11), fontWeight: '600' },
  noVisits: { padding: scale(24), alignItems: 'center' },
  noVisitsText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(8) },
  visitCountBadge: {
    width: scale(28), height: scale(28), borderRadius: scale(14),
    alignItems: 'center', justifyContent: 'center',
  },
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6),
    paddingVertical: scale(14), borderTopWidth: 1, borderTopColor: C.border,
  },
  showMoreText: { fontSize: moderateScale(13), fontWeight: '600', color: C.info },

  // Mini tags
  miniTag: { paddingHorizontal: scale(8), paddingVertical: scale(2), borderRadius: scale(6) },

  // Note box
  noteBox: { borderRadius: scale(12), padding: scale(14) },

  // Breakdowns
  breakdownHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(8) },
  breakdownLabel: { fontSize: moderateScale(13), color: C.muted },
  breakdownCount: { fontSize: moderateScale(13), fontWeight: '700', color: C.ink },
  breakdownBarBg: { height: scale(8), backgroundColor: C.border, borderRadius: scale(4), overflow: 'hidden', marginBottom: scale(8) },
  breakdownBarFill: { height: scale(8), borderRadius: scale(4) },

  // Breakdown Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingVertical: scale(12), backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  modalCloseBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  modalSection: { marginBottom: scale(20) },
  modalLabel: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink, marginBottom: scale(8) },
  modalInput: {
    backgroundColor: C.card, borderRadius: scale(12), borderWidth: 1, borderColor: C.border,
    padding: scale(14), fontSize: moderateScale(15), color: C.text,
  },
  modalTextArea: { minHeight: scale(120) },
  urgencyRow: { flexDirection: 'row', gap: scale(10) },
  urgencyChip: {
    flex: 1, paddingVertical: scale(12), borderRadius: scale(12), alignItems: 'center',
    borderWidth: 2, borderColor: C.border, backgroundColor: C.card,
  },
  urgencyText: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  submitBreakdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8),
    backgroundColor: C.purple, paddingVertical: scale(16), borderRadius: scale(14), marginTop: scale(8),
  },
  submitBreakdownText: { fontSize: moderateScale(16), fontWeight: '700', color: '#fff' },
});
