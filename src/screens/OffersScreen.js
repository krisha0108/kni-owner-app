/**
 * ============================================================================
 * OFFERS SCREEN - active booking discount campaigns
 * ============================================================================
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import { scale, moderateScale } from '../utils/responsive';
import { isStale, markFetched } from '../utils/focusCache';

const C = {
  primary: '#EF3A3A', primaryDark: '#DC2626', ink: '#1D2254', text: '#334155',
  muted: '#94A3B8', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0',
  ok: '#10B981', warn: '#F59E0B', danger: '#EF4444', purple: '#7C3AED',
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

function SkeletonOffers({ pulse }) {
  return (
    <View style={styles.listContent}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={styles.offerCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Animated.View style={[styles.iconBox, styles.skelFill, { opacity: pulse }]} />
              <View style={styles.skelTextCol}>
                <Animated.View style={[styles.skelLine, styles.skelLineWide, { opacity: pulse }]} />
                <Animated.View style={[styles.skelLine, styles.skelLineSmall, styles.skelLineMed, { opacity: pulse }]} />
              </View>
            </View>
            <Animated.View style={[styles.skelDiscount, { opacity: pulse }]} />
          </View>
          <View style={styles.dateRow}>
            <Animated.View style={[styles.skelLine, styles.skelLineSmall, styles.skelLineWide, { opacity: pulse }]} />
          </View>
          <Animated.View style={[styles.skelBadge, { opacity: pulse }]} />
        </View>
      ))}
    </View>
  );
}

export default function OffersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { selectedRestaurantId: selectedRestaurant } = useRestaurant();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offers, setOffers] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useFocusEffect(
    useCallback(() => {
      const key = `Offers-${selectedRestaurant}`;
      if (isStale(key) || offers.length === 0) {
        loadData();
        markFetched(key);
      }
    }, [selectedRestaurant, offers.length])
  );

  const loadData = async () => {
    try {
      const params = selectedRestaurant ? { restaurantId: selectedRestaurant } : {};
      const response = await api.get('/owner/offers', { params });
      if (response.data.ok) {
        setOffers(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    markFetched(`Offers-${selectedRestaurant}`);
  };

  const renderOfferCard = ({ item }) => {
    const badge = item.isUpcoming
      ? { bg: C.warn + '15', color: C.warn, label: 'Starts soon' }
      : item.type === 'FIRST_BOOKING' && !item.eligible
      ? { bg: C.muted + '15', color: C.muted, label: 'For new customers only' }
      : { bg: C.ok + '15', color: C.ok, label: 'Applies to your next booking' };

    return (
      <View style={styles.offerCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconBox, { backgroundColor: item.type === 'FIRST_BOOKING' ? C.purple + '15' : C.primary + '15' }]}>
              <Icon
                name={item.type === 'FIRST_BOOKING' ? 'gift-outline' : 'pricetag-outline'}
                size={22}
                color={item.type === 'FIRST_BOOKING' ? C.purple : C.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.offerName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.offerType}>{item.type === 'FIRST_BOOKING' ? 'First Booking Offer' : 'Promotional'}</Text>
            </View>
          </View>
          <Text style={styles.discountValue}>{item.discountPercent}%</Text>
        </View>

        <View style={styles.dateRow}>
          <Icon name="calendar-outline" size={14} color={C.muted} />
          <Text style={styles.dateText}>
            {item.startDate ? formatDate(item.startDate) : 'Started'} — {item.endDate ? formatDate(item.endDate) : 'No end date'}
          </Text>
        </View>

        {item.category && (
          <Text style={styles.dateText}>Applies to: {item.category.name} only</Text>
        )}

        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.heroHeader}>
          <View style={styles.heroBlobA} pointerEvents="none" />
          <View style={styles.heroBlobB} pointerEvents="none" />
          <View style={[styles.heroContent, { paddingTop: insets.top + scale(8) }]}>
            <TouchableOpacity
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
              style={styles.backBtnPlain}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={[styles.menuBtn, { marginRight: scale(10) }]}>
              <Icon name="menu" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.heroTitle, { flex: 1 }]}>Offers</Text>
          </View>
          <Text style={styles.heroSubtitle}>Discounts on service &amp; parts bookings — best one applies automatically</Text>
        </LinearGradient>
        <SkeletonOffers pulse={pulse} />
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroHeader}>
        <View style={styles.heroBlobA} pointerEvents="none" />
        <View style={styles.heroBlobB} pointerEvents="none" />
        <View style={[styles.heroContent, { paddingTop: insets.top + scale(8) }]}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            style={styles.backBtnPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={[styles.menuBtn, { marginRight: scale(10) }]}>
            <Icon name="menu" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.heroTitle, { flex: 1 }]}>Offers</Text>
        </View>
        <Text style={styles.heroSubtitle}>Discounts on service &amp; parts bookings — best one applies automatically</Text>
      </LinearGradient>

      <FlatList
        data={offers}
        keyExtractor={(item) => item.id}
        renderItem={renderOfferCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <View style={styles.emptyIconBox}>
              <Icon name="gift-outline" size={48} color={C.muted} />
            </View>
            <Text style={styles.emptyTitle}>No Offers Running</Text>
            <Text style={styles.emptySubtitle}>Check back later for discounts on bookings</Text>
          </View>
        }
      />

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  heroHeader: { paddingBottom: scale(20), borderBottomLeftRadius: scale(24), borderBottomRightRadius: scale(24), overflow: 'hidden' },
  heroBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  heroBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  heroContent: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(8),
  },
  backBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  backBtnPlain: { width: scale(26), height: scale(40), alignItems: 'center', justifyContent: 'center', marginRight: scale(4) },
  heroTitle: { fontSize: moderateScale(20), fontWeight: '700', color: '#fff' },
  menuBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  heroSubtitle: { fontSize: moderateScale(13), color: 'rgba(255,255,255,0.85)', paddingHorizontal: scale(16) },

  listContent: { padding: scale(16), paddingBottom: scale(100) },

  offerCard: {
    backgroundColor: C.card, borderRadius: scale(16), padding: scale(16), marginBottom: scale(12), gap: scale(10),
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(12), flex: 1 },
  iconBox: { width: scale(44), height: scale(44), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center' },
  offerName: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  offerType: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  discountValue: { fontSize: moderateScale(22), fontWeight: '800', color: C.ok },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  dateText: { fontSize: moderateScale(12), color: C.muted },

  badge: { alignSelf: 'flex-start', paddingHorizontal: scale(10), paddingVertical: scale(5), borderRadius: scale(10) },
  badgeText: { fontSize: moderateScale(11), fontWeight: '600' },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(12) },

  // Skeleton loading
  skelFill: { backgroundColor: '#E2E8F0' },
  skelTextCol: { flex: 1 },
  skelLine: { height: scale(11), width: '60%', borderRadius: scale(4), backgroundColor: '#E2E8F0' },
  skelLineSmall: { height: scale(8), marginTop: scale(6) },
  skelLineMed: { width: '40%' },
  skelLineWide: { width: '70%' },
  skelDiscount: { width: scale(38), height: scale(20), borderRadius: scale(6), backgroundColor: '#E2E8F0' },
  skelBadge: { width: scale(140), height: scale(20), borderRadius: scale(10), backgroundColor: '#E2E8F0' },

  emptyList: { alignItems: 'center', paddingTop: scale(60) },
  emptyIconBox: {
    width: scale(100), height: scale(100), borderRadius: scale(50),
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(20),
  },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },
});
