import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, Alert, Share, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import RNHTMLtoPDF from 'react-native-html-to-pdf';

const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  ok: '#10B981',
  warn: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'completed':
      return { bg: '#ECFDF5', color: C.ok, icon: 'checkmark-circle' };
    case 'in_progress':
    case 'accepted':
      return { bg: '#EFF6FF', color: C.info, icon: 'time' };
    case 'pending':
      return { bg: '#FFFBEB', color: C.warn, icon: 'hourglass' };
    case 'cancelled':
    case 'rejected':
      return { bg: '#FEF2F2', color: C.danger, icon: 'close-circle' };
    default:
      return { bg: '#F3F4F6', color: C.muted, icon: 'ellipse' };
  }
};

const getWarrantyStyle = (status) => {
  switch (status) {
    case 'active':
      return { bg: '#ECFDF5', color: C.ok, label: 'Active' };
    case 'expiring_soon':
      return { bg: '#FFFBEB', color: C.warn, label: 'Expiring Soon' };
    case 'expired':
      return { bg: '#FEF2F2', color: C.danger, label: 'Expired' };
    default:
      return { bg: '#F3F4F6', color: C.muted, label: 'Unknown' };
  }
};

const getAmcStatusStyle = (status) => {
  switch (status) {
    case 'active':
      return { bg: '#ECFDF5', color: C.ok };
    case 'expiring_soon':
      return { bg: '#FFFBEB', color: C.warn };
    case 'expired':
      return { bg: '#FEF2F2', color: C.danger };
    default:
      return { bg: '#F3F4F6', color: C.muted };
  }
};

export default function EquipmentProfileScreen({ navigation, route }) {
  const { equipmentId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('history');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchEquipment = useCallback(async () => {
    if (!equipmentId) return;
    try {
      const { data: res } = await api.get(`/restaurant-owner/my-equipment/${equipmentId}`);
      setData(res);
    } catch (error) {
      console.log('Error fetching equipment:', error);
      Alert.alert('Error', 'Failed to load equipment details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEquipment();
  };

  const downloadPdf = async () => {
    if (!equipmentId || downloadingPdf) return;

    setDownloadingPdf(true);
    try {
      const { data: res } = await api.get(`/restaurant-owner/my-equipment/${equipmentId}/pdf`);

      if (res.success && res.html) {
        const options = {
          html: res.html,
          fileName: `Equipment_${res.equipment_name || equipmentId}_${Date.now()}`,
          directory: Platform.OS === 'ios' ? 'Documents' : 'Download',
        };

        const file = await RNHTMLtoPDF.convert(options);

        Alert.alert(
          'PDF Downloaded',
          `Equipment profile saved to ${Platform.OS === 'ios' ? 'Files app' : 'Downloads folder'}`,
          [
            { text: 'OK' },
            {
              text: 'Share',
              onPress: () => {
                Share.share({
                  url: Platform.OS === 'ios' ? file.filePath : `file://${file.filePath}`,
                  title: `Equipment Profile - ${res.equipment_name}`,
                });
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to generate PDF');
      }
    } catch (error) {
      console.log('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download equipment PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data || !data.equipment) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Equipment Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={st.emptyBox}>
          <Icon name="alert-circle-outline" size={64} color={C.muted} />
          <Text style={st.emptyTitle}>Equipment Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { equipment, stats, active_amc, amcs, service_history } = data;
  const warrantyStyle = getWarrantyStyle(equipment.warranty_status);

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.headerTitle} numberOfLines={1}>{equipment.name}</Text>
        <TouchableOpacity
          onPress={downloadPdf}
          style={st.backBtn}
          disabled={downloadingPdf}
        >
          {downloadingPdf ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : (
            <Icon name="download-outline" size={22} color={C.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        contentContainerStyle={st.scrollContent}
      >
        {/* Equipment Info Card */}
        <View style={st.infoCard}>
          <View style={st.infoHeader}>
            <View style={st.iconBox}>
              <Icon name="hardware-chip-outline" size={32} color={C.primary} />
            </View>
            <View style={st.infoMain}>
              <Text style={st.equipName}>{equipment.name}</Text>
              {equipment.brand && (
                <Text style={st.equipSub}>
                  {equipment.brand}{equipment.model_number ? ` - ${equipment.model_number}` : ''}
                </Text>
              )}
              {equipment.category && (
                <View style={st.catBadge}>
                  <Text style={st.catText}>{equipment.category}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Quick Stats */}
          <View style={st.statsRow}>
            <View style={st.statBox}>
              <Text style={st.statValue}>{stats.total_services}</Text>
              <Text style={st.statLabel}>Services</Text>
            </View>
            <View style={st.statBox}>
              <Text style={[st.statValue, { color: C.ok }]}>{stats.completed_services}</Text>
              <Text style={st.statLabel}>Completed</Text>
            </View>
            <View style={st.statBox}>
              <Text style={[st.statValue, { color: C.primary }]}>
                {stats.total_spent > 0 ? `₹${stats.total_spent.toLocaleString()}` : '₹0'}
              </Text>
              <Text style={st.statLabel}>Total Spent</Text>
            </View>
          </View>
        </View>

        {/* Warranty & AMC Status */}
        <View style={st.statusRow}>
          {equipment.warranty_end_date && (
            <View style={[st.statusCard, { backgroundColor: warrantyStyle.bg }]}>
              <Icon name="shield-checkmark-outline" size={20} color={warrantyStyle.color} />
              <View style={st.statusInfo}>
                <Text style={[st.statusTitle, { color: warrantyStyle.color }]}>Warranty</Text>
                <Text style={st.statusValue}>
                  {equipment.warranty_status === 'expired' ? 'Expired' : `Until ${equipment.warranty_end_date}`}
                </Text>
              </View>
            </View>
          )}

          {active_amc && (
            <View style={[st.statusCard, { backgroundColor: getAmcStatusStyle(active_amc.status).bg }]}>
              <Icon name="document-text-outline" size={20} color={getAmcStatusStyle(active_amc.status).color} />
              <View style={st.statusInfo}>
                <Text style={[st.statusTitle, { color: getAmcStatusStyle(active_amc.status).color }]}>AMC Active</Text>
                <Text style={st.statusValue}>{active_amc.remaining_visits} visits left</Text>
              </View>
            </View>
          )}
        </View>

        {/* Equipment Details */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Equipment Details</Text>
          <View style={st.detailsCard}>
            {equipment.serial_number && (
              <View style={st.detailRow}>
                <Text style={st.detailLabel}>Serial Number</Text>
                <Text style={st.detailValue}>{equipment.serial_number}</Text>
              </View>
            )}
            {equipment.purchase_date && (
              <View style={st.detailRow}>
                <Text style={st.detailLabel}>Purchase Date</Text>
                <Text style={st.detailValue}>{equipment.purchase_date}</Text>
              </View>
            )}
            {stats.last_service_date && (
              <View style={st.detailRow}>
                <Text style={st.detailLabel}>Last Service</Text>
                <Text style={st.detailValue}>{stats.last_service_date}</Text>
              </View>
            )}
            {equipment.restaurant && (
              <View style={st.detailRow}>
                <Text style={st.detailLabel}>Location</Text>
                <Text style={st.detailValue}>{equipment.restaurant.name}</Text>
              </View>
            )}
            {equipment.description && (
              <View style={[st.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={st.detailLabel}>Notes</Text>
                <Text style={st.detailValue}>{equipment.description}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={st.tabBar}>
          <TouchableOpacity
            style={[st.tab, activeTab === 'history' && st.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Icon name="time-outline" size={18} color={activeTab === 'history' ? C.primary : C.muted} />
            <Text style={[st.tabText, activeTab === 'history' && st.tabTextActive]}>Service History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.tab, activeTab === 'amc' && st.tabActive]}
            onPress={() => setActiveTab('amc')}
          >
            <Icon name="shield-outline" size={18} color={activeTab === 'amc' ? C.primary : C.muted} />
            <Text style={[st.tabText, activeTab === 'amc' && st.tabTextActive]}>AMC Contracts</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'history' && (
          <View style={st.section}>
            {service_history && service_history.length > 0 ? (
              service_history.map((service, index) => {
                const statusStyle = getStatusStyle(service.status);
                return (
                  <View key={service.id} style={st.historyCard}>
                    <View style={st.historyTimeline}>
                      <View style={[st.timelineDot, { backgroundColor: statusStyle.color }]} />
                      {index < service_history.length - 1 && <View style={st.timelineLine} />}
                    </View>
                    <View style={st.historyContent}>
                      <View style={st.historyHeader}>
                        <Text style={st.historyDate}>{service.service_date || service.created_at}</Text>
                        <View style={[st.historyStatus, { backgroundColor: statusStyle.bg }]}>
                          <Icon name={statusStyle.icon} size={12} color={statusStyle.color} />
                          <Text style={[st.historyStatusText, { color: statusStyle.color }]}>
                            {service.status?.replace('_', ' ')}
                          </Text>
                        </View>
                      </View>
                      <Text style={st.historyDesc} numberOfLines={2}>
                        {service.description || service.product_name || 'Service request'}
                      </Text>
                      <View style={st.historyFooter}>
                        {service.engineer && (
                          <View style={st.historyMeta}>
                            <Icon name="person-outline" size={12} color={C.muted} />
                            <Text style={st.historyMetaText}>{service.engineer.name}</Text>
                          </View>
                        )}
                        {service.cost > 0 && (
                          <View style={st.historyMeta}>
                            <Icon name="cash-outline" size={12} color={C.ok} />
                            <Text style={[st.historyMetaText, { color: C.ok }]}>₹{service.cost}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={st.emptySection}>
                <Icon name="construct-outline" size={48} color={C.muted} />
                <Text style={st.emptySectionText}>No service history yet</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'amc' && (
          <View style={st.section}>
            {amcs && amcs.length > 0 ? (
              amcs.map(amc => {
                const amcStyle = getAmcStatusStyle(amc.status);
                return (
                  <View key={amc.id} style={st.amcCard}>
                    <View style={st.amcHeader}>
                      <View style={st.amcInfo}>
                        <Text style={st.amcVendor}>{amc.vendor_name || 'AMC Contract'}</Text>
                        {amc.contract_number && (
                          <Text style={st.amcContract}>#{amc.contract_number}</Text>
                        )}
                      </View>
                      <View style={[st.amcStatus, { backgroundColor: amcStyle.bg }]}>
                        <Text style={[st.amcStatusText, { color: amcStyle.color }]}>
                          {amc.status?.replace('_', ' ')}
                        </Text>
                      </View>
                    </View>
                    <View style={st.amcDetails}>
                      <View style={st.amcDetail}>
                        <Text style={st.amcDetailLabel}>Period</Text>
                        <Text style={st.amcDetailValue}>{amc.start_date} to {amc.end_date}</Text>
                      </View>
                      <View style={st.amcDetail}>
                        <Text style={st.amcDetailLabel}>Visits</Text>
                        <Text style={st.amcDetailValue}>
                          {amc.service_visits_used}/{amc.service_visits_included} used
                        </Text>
                      </View>
                      {amc.amount > 0 && (
                        <View style={st.amcDetail}>
                          <Text style={st.amcDetailLabel}>Amount</Text>
                          <Text style={st.amcDetailValue}>₹{amc.amount}</Text>
                        </View>
                      )}
                    </View>
                    <View style={st.amcProgress}>
                      <View style={st.progressBar}>
                        <View
                          style={[
                            st.progressFill,
                            {
                              width: `${Math.min(100, (amc.service_visits_used / amc.service_visits_included) * 100)}%`,
                              backgroundColor: amc.remaining_visits > 0 ? C.ok : C.danger
                            }
                          ]}
                        />
                      </View>
                      <Text style={st.progressText}>{amc.remaining_visits} visits remaining</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={st.emptySection}>
                <Icon name="document-text-outline" size={48} color={C.muted} />
                <Text style={st.emptySectionText}>No AMC contracts</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Request Service Button */}
      <View style={st.footer}>
        <TouchableOpacity
          style={st.requestBtn}
          onPress={() => navigation.navigate('ServiceRequest', { equipmentId: equipment.id, equipmentName: equipment.name })}
        >
          <Icon name="construct-outline" size={20} color="#fff" />
          <Text style={st.requestBtnText}>Request Service</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: C.ink, flex: 1, textAlign: 'center' },

  scrollContent: { paddingBottom: 100 },

  infoCard: {
    backgroundColor: C.card, margin: 16, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: C.border
  },
  infoHeader: { flexDirection: 'row', gap: 12 },
  iconBox: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: '#FFE8E8',
    alignItems: 'center', justifyContent: 'center'
  },
  infoMain: { flex: 1 },
  equipName: { fontSize: 20, fontWeight: '900', color: C.ink },
  equipSub: { fontSize: 14, color: C.muted, marginTop: 2 },
  catBadge: { marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.bg, borderRadius: 8, alignSelf: 'flex-start' },
  catText: { fontSize: 12, fontWeight: '600', color: C.muted },

  statsRow: { flexDirection: 'row', marginTop: 16, gap: 8 },
  statBox: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: C.bg, borderRadius: 12 },
  statValue: { fontSize: 18, fontWeight: '900', color: C.ink },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2 },

  statusRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  statusCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 12
  },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 12, fontWeight: '700' },
  statusValue: { fontSize: 11, color: C.muted, marginTop: 2 },

  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: C.ink, marginBottom: 12 },

  detailsCard: { backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  detailLabel: { fontSize: 13, color: C.muted },
  detailValue: { fontSize: 13, fontWeight: '600', color: C.ink, textAlign: 'right', flex: 1, marginLeft: 16 },

  tabBar: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: C.card, borderRadius: 12, padding: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: C.bg },
  tabText: { fontSize: 13, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primary },

  historyCard: { flexDirection: 'row', marginBottom: 4 },
  historyTimeline: { width: 24, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLine: { width: 2, flex: 1, backgroundColor: C.border, marginTop: 4 },
  historyContent: {
    flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12,
    marginLeft: 8, marginBottom: 12, borderWidth: 1, borderColor: C.border
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { fontSize: 12, fontWeight: '700', color: C.ink },
  historyStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  historyStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  historyDesc: { fontSize: 13, color: C.muted, marginTop: 6 },
  historyFooter: { flexDirection: 'row', gap: 12, marginTop: 8 },
  historyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyMetaText: { fontSize: 11, color: C.muted },

  amcCard: { backgroundColor: C.card, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  amcHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amcInfo: { flex: 1 },
  amcVendor: { fontSize: 15, fontWeight: '700', color: C.ink },
  amcContract: { fontSize: 12, color: C.muted, marginTop: 2 },
  amcStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  amcStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  amcDetails: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 16 },
  amcDetail: {},
  amcDetailLabel: { fontSize: 11, color: C.muted },
  amcDetailValue: { fontSize: 13, fontWeight: '600', color: C.ink, marginTop: 2 },
  amcProgress: { marginTop: 12 },
  progressBar: { height: 6, backgroundColor: C.bg, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11, color: C.muted, marginTop: 4 },

  emptySection: { alignItems: 'center', paddingVertical: 32 },
  emptySectionText: { fontSize: 14, color: C.muted, marginTop: 8 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  requestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12
  },
  requestBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
