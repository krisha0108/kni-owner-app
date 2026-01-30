import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Image, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, getImageUrl } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

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

const formatPrice = (amount) => {
  return `₹${(amount || 0).toFixed(2)}`;
};

export default function CategoryDetailScreen({ navigation, route }) {
  const { categoryId, categoryName } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState(null);
  const [services, setServices] = useState([]);
  const [parts, setParts] = useState([]);
  const [activeTab, setActiveTab] = useState('services');
  const [cart, setCart] = useState({});
  const [addingToCart, setAddingToCart] = useState({});
  const [menuVisible, setMenuVisible] = useState(false);

  const fetchCategoryItems = useCallback(async () => {
    if (!categoryId) return;

    try {
      setLoading(true);
      const response = await api.get(`/app/categories/${categoryId}/items`);
      if (response.data.ok || response.data.data) {
        const data = response.data.data || response.data;
        setCategory(data.category || { name: categoryName });
        setServices(data.services || data.serviceItems || []);
        setParts(data.parts || data.partItems || []);
      }
    } catch (error) {
      console.log('Error fetching category items:', error);
      // Try alternative endpoint
      try {
        const catResponse = await api.get(`/app/categories/${categoryId}`);
        if (catResponse.data) {
          setCategory(catResponse.data.data || catResponse.data);
        }
        const itemsResponse = await api.get(`/owner/category/${categoryId}/items`);
        if (itemsResponse.data.ok) {
          setServices(itemsResponse.data.data?.services || []);
          setParts(itemsResponse.data.data?.parts || []);
        }
      } catch (altError) {
        console.log('Alternative fetch failed:', altError);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, categoryName]);

  useFocusEffect(
    useCallback(() => {
      fetchCategoryItems();
    }, [fetchCategoryItems])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategoryItems();
  };

  const addToCart = async (item, type) => {
    const itemId = item.id;
    setAddingToCart(prev => ({ ...prev, [itemId]: true }));

    try {
      const response = await api.post('/owner/cart', {
        itemType: type === 'service' ? 'SERVICE' : 'PART',
        [type === 'service' ? 'serviceItemId' : 'partItemId']: itemId,
        qty: 1,
      });

      if (response.data.ok) {
        setCart(prev => ({
          ...prev,
          [itemId]: (prev[itemId] || 0) + 1,
        }));
        Alert.alert('Success', `${item.name} added to cart`);
      } else {
        Alert.alert('Error', response.data.error || 'Failed to add to cart');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add to cart');
    } finally {
      setAddingToCart(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const renderServiceItem = ({ item }) => (
    <View style={st.itemCard}>
      <View style={st.itemHeader}>
        {item.imageUrl ? (
          <Image source={{ uri: getImageUrl(item.imageUrl) }} style={st.itemImage} />
        ) : (
          <View style={[st.itemImage, st.itemImagePlaceholder]}>
            <Icon name="construct" size={24} color={C.info} />
          </View>
        )}
        <View style={st.itemInfo}>
          <Text style={st.itemName} numberOfLines={2}>{item.name}</Text>
          {item.description && (
            <Text style={st.itemDescription} numberOfLines={2}>{item.description}</Text>
          )}
        </View>
      </View>
      <View style={st.itemFooter}>
        <View>
          <Text style={st.itemPriceLabel}>Price</Text>
          <Text style={st.itemPrice}>{formatPrice(item.price || 0)}</Text>
        </View>
        <TouchableOpacity
          style={[st.addBtn, addingToCart[item.id] && st.addBtnLoading]}
          onPress={() => addToCart(item, 'service')}
          disabled={addingToCart[item.id]}
        >
          {addingToCart[item.id] ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="add" size={18} color="#fff" />
              <Text style={st.addBtnText}>Add</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPartItem = ({ item }) => (
    <View style={st.itemCard}>
      <View style={st.itemHeader}>
        {item.imageUrl ? (
          <Image source={{ uri: getImageUrl(item.imageUrl) }} style={st.itemImage} />
        ) : (
          <View style={[st.itemImage, st.itemImagePlaceholder, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="pricetag" size={24} color={C.warn} />
          </View>
        )}
        <View style={st.itemInfo}>
          <Text style={st.itemName} numberOfLines={2}>{item.name}</Text>
          {item.description && (
            <Text style={st.itemDescription} numberOfLines={2}>{item.description}</Text>
          )}
          {item.sku && (
            <Text style={st.itemSku}>SKU: {item.sku}</Text>
          )}
        </View>
      </View>
      <View style={st.itemFooter}>
        <View>
          <Text style={st.itemPriceLabel}>Price</Text>
          <Text style={st.itemPrice}>{formatPrice(item.price || 0)}</Text>
        </View>
        <TouchableOpacity
          style={[st.addBtn, st.addBtnWarn, addingToCart[item.id] && st.addBtnLoading]}
          onPress={() => addToCart(item, 'part')}
          disabled={addingToCart[item.id]}
        >
          {addingToCart[item.id] ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="add" size={18} color="#fff" />
              <Text style={st.addBtnText}>Add</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const activeData = activeTab === 'services' ? services : parts;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle} numberOfLines={1}>{categoryName || 'Category'}</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
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
        <Text style={st.headerTitle} numberOfLines={1}>{category?.name || categoryName || 'Category'}</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
      </View>

      {/* Category Header */}
      <View style={st.categoryHeader}>
        <View style={st.categoryIconBox}>
          <Icon name="folder-open" size={28} color={C.primary} />
        </View>
        <View style={st.categoryInfo}>
          <Text style={st.categoryName}>{category?.name || categoryName}</Text>
          <View style={st.categoryStats}>
            <Text style={st.categoryStat}>{services.length} services</Text>
            <Text style={st.categoryStatDot}>•</Text>
            <Text style={st.categoryStat}>{parts.length} parts</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={st.tabBar}>
        <TouchableOpacity
          style={[st.tab, activeTab === 'services' && st.tabActive]}
          onPress={() => setActiveTab('services')}
        >
          <Icon name="construct-outline" size={18} color={activeTab === 'services' ? C.primary : C.muted} />
          <Text style={[st.tabText, activeTab === 'services' && st.tabTextActive]}>
            Services ({services.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.tab, activeTab === 'parts' && st.tabActive]}
          onPress={() => setActiveTab('parts')}
        >
          <Icon name="pricetag-outline" size={18} color={activeTab === 'parts' ? C.warn : C.muted} />
          <Text style={[st.tabText, activeTab === 'parts' && st.tabTextActive]}>
            Parts ({parts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <FlatList
        data={activeData}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={activeTab === 'services' ? renderServiceItem : renderPartItem}
        contentContainerStyle={st.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        ListEmptyComponent={
          <View style={st.emptyBox}>
            <Icon
              name={activeTab === 'services' ? 'construct-outline' : 'pricetag-outline'}
              size={48}
              color={C.muted}
            />
            <Text style={st.emptyTitle}>No {activeTab === 'services' ? 'Services' : 'Parts'} Available</Text>
            <Text style={st.emptyText}>Check back later for updates</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* View Cart Button */}
      <View style={st.footer}>
        <TouchableOpacity style={st.viewCartBtn} onPress={() => navigation.navigate('Cart')}>
          <Icon name="cart" size={20} color="#fff" />
          <Text style={st.viewCartText}>View Cart</Text>
          <Icon name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: C.ink, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  cartBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

  categoryHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: C.card,
  },
  categoryIconBox: {
    width: 56, height: 56, borderRadius: 14, backgroundColor: '#FFE8E8',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: 18, fontWeight: '700', color: C.ink },
  categoryStats: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  categoryStat: { fontSize: 13, color: C.muted },
  categoryStatDot: { fontSize: 13, color: C.muted, marginHorizontal: 6 },

  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 12,
    backgroundColor: C.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
  },
  tabActive: { backgroundColor: C.bg },
  tabText: { fontSize: 13, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.ink },

  listContent: { padding: 16, paddingBottom: 100 },

  itemCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  itemHeader: { flexDirection: 'row', marginBottom: 12 },
  itemImage: { width: 64, height: 64, borderRadius: 12, marginRight: 12 },
  itemImagePlaceholder: { backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: C.ink },
  itemDescription: { fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 18 },
  itemSku: { fontSize: 11, color: C.muted, marginTop: 4, fontFamily: 'monospace' },
  itemFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  itemPriceLabel: { fontSize: 11, color: C.muted },
  itemPrice: { fontSize: 18, fontWeight: '900', color: C.ink },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: C.info,
  },
  addBtnWarn: { backgroundColor: C.warn },
  addBtnLoading: { opacity: 0.6 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  emptyBox: { alignItems: 'center', paddingTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 12 },
  emptyText: { fontSize: 13, color: C.muted, marginTop: 4 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
  },
  viewCartBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12,
  },
  viewCartText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
