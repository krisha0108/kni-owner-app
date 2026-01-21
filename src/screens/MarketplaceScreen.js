import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';

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

export default function MarketplaceScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory])
  );

  const loadData = async () => {
    try {
      setLoading(true);

      // Get first restaurant
      const restaurantsRes = await api.get('/owner/restaurants');
      if (restaurantsRes.data.ok && restaurantsRes.data.data.length > 0) {
        const firstRestaurant = restaurantsRes.data.data.find(r => r.status === 'APPROVED');
        if (firstRestaurant) {
          const params = new URLSearchParams();
          params.append('restaurantId', firstRestaurant.id);

          if (selectedCategory && selectedCategory !== 'all') {
            params.append('categoryId', selectedCategory);
          }

          const response = await api.get(`/owner/marketplace/products?${params}`);

          if (response.data.ok) {
            setProducts(response.data.data || []);
            // Categories would come from a separate endpoint if needed
            setCategories([]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading marketplace:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredProducts = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderProductCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('MarketplaceProduct', { product: item })}
    >
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.productImage} />
      )}
      <View style={styles.cardContent}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        {item.description && (
          <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>₹{item.price}</Text>
          {item.inStock ? (
            <View style={styles.stockBadge}>
              <Icon name="checkmark-circle" size={14} color={C.ok} />
              <Text style={styles.stockText}>In Stock</Text>
            </View>
          ) : (
            <View style={[styles.stockBadge, { backgroundColor: '#FEF2F2' }]}>
              <Icon name="close-circle" size={14} color={C.danger} />
              <Text style={[styles.stockText, { color: C.danger }]}>Out of Stock</Text>
            </View>
          )}
        </View>
        {item.vendor && (
          <View style={styles.vendorRow}>
            <Icon name="business-outline" size={12} color={C.muted} />
            <Text style={styles.vendorText}>{typeof item.vendor === 'object' ? item.vendor.name : item.vendor}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Marketplace</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MarketplaceOrders')}>
            <Icon name="cart-outline" size={24} color={C.ink} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <TouchableOpacity onPress={() => navigation.navigate('MarketplaceOrders')}>
          <Icon name="cart-outline" size={24} color={C.ink} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search-outline" size={18} color={C.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close-circle" size={18} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      {categories.length > 0 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: 'all', name: 'All' }, ...categories]}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item.id && styles.categoryChipActive
              ]}
              onPress={() => setSelectedCategory(item.id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item.id && styles.categoryTextActive
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.categoryList}
        />
      )}

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        renderItem={renderProductCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="bag-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptyText}>
              {search ? 'Try a different search' : 'Check back later for new products'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  menuBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  searchContainer: { paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: C.text },

  categoryList: { paddingHorizontal: 16, paddingVertical: 12 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  categoryText: { fontSize: 13, fontWeight: '600', color: C.ink },
  categoryTextActive: { color: '#fff' },

  list: { padding: 16 },
  row: { justifyContent: 'space-between', marginBottom: 16 },
  card: {
    width: '48%',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: C.bg,
  },
  cardContent: { padding: 12 },
  productName: { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 4 },
  productDesc: { fontSize: 12, color: C.muted, marginBottom: 8, lineHeight: 16 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productPrice: { fontSize: 16, fontWeight: '700', color: C.primary },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
  },
  stockText: { fontSize: 10, fontWeight: '600', color: C.ok },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vendorText: { fontSize: 11, color: C.muted },

  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
});
