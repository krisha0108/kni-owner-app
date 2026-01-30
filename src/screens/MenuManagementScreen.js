import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
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

export default function MenuManagementScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [services, setServices] = useState([]);
  const [parts, setParts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('services'); // 'services' or 'parts'
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  useEffect(() => {
    if (selectedCategory) {
      loadCategoryItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [catRes, subRes] = await Promise.all([
        api.get('/public/categories'),
        api.get('/public/subcategories'),
      ]);

      if (catRes.data.ok) {
        setCategories(catRes.data.data || []);
        if (catRes.data.data?.length > 0 && !selectedCategory) {
          setSelectedCategory(catRes.data.data[0]);
        }
      }
      if (subRes.data.ok) {
        setSubcategories(subRes.data.data || []);
      }
    } catch (error) {
      console.log('Error loading categories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCategoryItems = async () => {
    if (!selectedCategory) return;

    try {
      const endpoint = activeTab === 'services'
        ? `/public/services?categoryId=${selectedCategory.id}`
        : `/public/parts?categoryId=${selectedCategory.id}`;

      const response = await api.get(endpoint);
      if (response.data.ok) {
        if (activeTab === 'services') {
          setServices(response.data.data || []);
        } else {
          setParts(response.data.data || []);
        }
      }
    } catch (error) {
      console.log('Error loading items:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatPrice = (amount) => {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  const filteredItems = (activeTab === 'services' ? services : parts).filter(item =>
    !search || item.name.toLowerCase().includes(search.toLowerCase())
  );

  const categorySubcategories = subcategories.filter(
    sub => sub.categoryId === selectedCategory?.id
  );

  const renderCategoryChip = (category) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryChip,
        selectedCategory?.id === category.id && styles.categoryChipActive,
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      {category.iconUrl && (
        <Image source={{ uri: category.iconUrl }} style={styles.categoryIcon} />
      )}
      <Text
        style={[
          styles.categoryText,
          selectedCategory?.id === category.id && styles.categoryTextActive,
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderItemCard = ({ item }) => (
    <TouchableOpacity style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.itemDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.itemFooter}>
          <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#ECFDF5' : '#FEF2F2' }]}>
            <View style={[styles.statusDot, { backgroundColor: item.isActive ? C.ok : C.danger }]} />
            <Text style={[styles.statusText, { color: item.isActive ? C.ok : C.danger }]}>
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('Cart', { addItem: item, itemType: activeTab === 'services' ? 'SERVICE' : 'PART' })}
      >
        <Icon name="add" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Menu</Text>
          <View style={{ width: 40 }} />
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Menu</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search-outline" size={18} color={C.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services or parts..."
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

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {categories.map(renderCategoryChip)}
      </ScrollView>

      {/* Service/Parts Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'services' && styles.tabActive]}
          onPress={() => setActiveTab('services')}
        >
          <Icon
            name="construct-outline"
            size={16}
            color={activeTab === 'services' ? C.primary : C.muted}
          />
          <Text style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>
            Services
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'parts' && styles.tabActive]}
          onPress={() => setActiveTab('parts')}
        >
          <Icon
            name="hardware-chip-outline"
            size={16}
            color={activeTab === 'parts' ? C.primary : C.muted}
          />
          <Text style={[styles.tabText, activeTab === 'parts' && styles.tabTextActive]}>
            Parts
          </Text>
        </TouchableOpacity>
      </View>

      {/* Subcategories */}
      {categorySubcategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subcategoryScroll}
          contentContainerStyle={styles.subcategoryScrollContent}
        >
          {categorySubcategories.map(sub => (
            <View key={sub.id} style={styles.subcategoryChip}>
              <Text style={styles.subcategoryText}>{sub.name}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Items List */}
      <FlatList
        data={filteredItems}
        renderItem={renderItemCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="cube-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Items Found</Text>
            <Text style={styles.emptyText}>
              {search ? 'Try a different search term' : `No ${activeTab} available in this category`}
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* Request New Category Button */}
      <TouchableOpacity
        style={styles.requestBtn}
        onPress={() => navigation.navigate('CategoryRequest')}
      >
        <Icon name="add-circle" size={20} color="#fff" />
        <Text style={styles.requestBtnText}>Request New Category</Text>
      </TouchableOpacity>
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

  categoryScroll: { maxHeight: 56, marginTop: 12 },
  categoryScrollContent: { paddingHorizontal: 16, gap: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  categoryIcon: { width: 20, height: 20, borderRadius: 4 },
  categoryText: { fontSize: 13, fontWeight: '600', color: C.ink },
  categoryTextActive: { color: '#fff' },

  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabActive: { backgroundColor: '#FFF0F0', borderColor: C.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primary },

  subcategoryScroll: { maxHeight: 40 },
  subcategoryScrollContent: { paddingHorizontal: 16, gap: 8 },
  subcategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    marginRight: 8,
  },
  subcategoryText: { fontSize: 12, fontWeight: '600', color: C.info },

  listContent: { padding: 16 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: C.ink },
  itemDesc: { fontSize: 13, color: C.muted, marginTop: 4 },
  itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  itemPrice: { fontSize: 16, fontWeight: '800', color: C.primary },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },

  requestBtn: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.ink,
  },
  requestBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
