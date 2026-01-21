import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, getImageUrl } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import KniBottomNav from '../components/KniBottomNav';

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

const CATEGORY_COLORS = [
  { bg: '#FFE8E8', icon: '#EF3A3A' },
  { bg: '#EFF6FF', icon: '#3B82F6' },
  { bg: '#ECFDF5', icon: '#10B981' },
  { bg: '#FEF3C7', icon: '#F59E0B' },
  { bg: '#F3E8FF', icon: '#8B5CF6' },
  { bg: '#FFEEDD', icon: '#F97316' },
];

export default function FeedScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/app/categories');
      if (response.data.ok || Array.isArray(response.data.data)) {
        setCategories(response.data.data || response.data || []);
      } else if (Array.isArray(response.data)) {
        setCategories(response.data);
      }
    } catch (error) {
      console.log('Error fetching categories:', error);
      // Try alternative endpoint
      try {
        const altResponse = await api.get('/owner/feed');
        if (altResponse.data.ok) {
          setCategories(altResponse.data.data || []);
        }
      } catch (altError) {
        console.log('Alternative fetch failed:', altError);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [fetchCategories])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const filteredCategories = categories.filter(cat =>
    cat.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCategoryCard = ({ item, index }) => {
    const colorScheme = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    const servicesCount = item._count?.serviceItems || item.servicesCount || 0;
    const partsCount = item._count?.partItems || item.partsCount || 0;

    return (
      <TouchableOpacity
        style={st.categoryCard}
        onPress={() => navigation.navigate('CategoryDetail', { categoryId: item.id, categoryName: item.name })}
        activeOpacity={0.7}
      >
        <View style={[st.categoryIconBox, { backgroundColor: colorScheme.bg }]}>
          {item.imageUrl ? (
            <Image source={{ uri: getImageUrl(item.imageUrl) }} style={st.categoryImage} />
          ) : (
            <Icon name="folder-open" size={32} color={colorScheme.icon} />
          )}
        </View>
        <View style={st.categoryInfo}>
          <Text style={st.categoryName} numberOfLines={2}>{item.name}</Text>
          <View style={st.categoryStats}>
            <View style={st.statBadge}>
              <Icon name="construct-outline" size={12} color={C.info} />
              <Text style={st.statBadgeText}>{servicesCount} services</Text>
            </View>
            <View style={st.statBadge}>
              <Icon name="pricetag-outline" size={12} color={C.warn} />
              <Text style={st.statBadgeText}>{partsCount} parts</Text>
            </View>
          </View>
        </View>
        <Icon name="chevron-forward" size={20} color={C.muted} />
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Service Categories</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={st.loadingText}>Loading categories...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Service Categories</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={st.cartBtn}>
          <Icon name="cart-outline" size={22} color={C.ink} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={st.searchContainer}>
        <View style={st.searchBox}>
          <Icon name="search" size={20} color={C.muted} />
          <TextInput
            style={st.searchInput}
            placeholder="Search categories..."
            placeholderTextColor={C.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Info Banner */}
      <View style={st.infoBanner}>
        <Icon name="sparkles" size={20} color={C.primary} />
        <Text style={st.infoText}>
          Browse our service categories and add items to your cart
        </Text>
      </View>

      {/* Categories List */}
      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={renderCategoryCard}
        contentContainerStyle={st.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        ListEmptyComponent={
          <View style={st.emptyBox}>
            <Icon name="folder-open-outline" size={64} color={C.muted} />
            <Text style={st.emptyTitle}>No Categories Found</Text>
            <Text style={st.emptyText}>
              {searchQuery ? 'Try a different search term' : 'No service categories available yet'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <KniBottomNav
        navigation={navigation}
        active="services"
        cartCount={0}
        notifCount={0}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 14, color: C.muted, marginTop: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: C.ink },
  cartBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

  searchContainer: { padding: 16, paddingBottom: 0 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 16, padding: 14,
    backgroundColor: '#FFF5F5', borderRadius: 12, borderWidth: 1, borderColor: '#FECACA',
  },
  infoText: { flex: 1, fontSize: 13, color: C.primary, lineHeight: 18 },

  listContent: { padding: 16, paddingBottom: 100 },

  categoryCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: C.card, borderRadius: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryIconBox: {
    width: 60, height: 60, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: 14, overflow: 'hidden',
  },
  categoryImage: { width: 60, height: 60, borderRadius: 14 },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 8 },
  categoryStats: { flexDirection: 'row', gap: 10 },
  statBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  statBadgeText: { fontSize: 11, color: C.muted, fontWeight: '600' },

  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },
});
