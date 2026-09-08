import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import SearchBar from '../components/SearchBar';
import CategoryChips from '../components/CategoryChips';
import ProductCard from '../components/ProductCard';
import { categories as staticCategories, mockProducts } from '../data/mockProducts';
import { useCart } from '../context/CartContext';
import { getProducts, getCategories } from '../api/products';
import NotificationBell from '../components/NotificationBell';

const sorts = [
  { id: 'fresh', label: 'Freshness' },
  { id: 'distance', label: 'Distance' },
  { id: 'price_low', label: 'Price: Low' },
  { id: 'price_high', label: 'Price: High' },
];

export default function FeedScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [sort, setSort] = useState('fresh');
  const [showFilters, setShowFilters] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [priceMax, setPriceMax] = useState(null);
  const [categories, setCategories] = useState(staticCategories);
  const [products, setProducts] = useState(mockProducts);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [usingMock, setUsingMock] = useState(false);
  const { add, count, total } = useCart();

  const fetchProducts = useCallback(async (overrides = {}) => {
    const params = {
      search: overrides.search !== undefined ? overrides.search : query,
      category: overrides.category !== undefined ? overrides.category : activeCat,
      sort: overrides.sort !== undefined ? overrides.sort : sort,
      verified_only: overrides.verifiedOnly !== undefined ? overrides.verifiedOnly : verifiedOnly ? 1 : undefined,
      price_max: overrides.priceMax !== undefined ? overrides.priceMax : priceMax ?? undefined,
    };
    setLoading(true);
    setError(null);
    try {
      const res = await getProducts(params);
      const data = res.data ?? [];
      if (data.length) {
        setProducts(data);
        setUsingMock(false);
      } else {
        // keep current or fallback
        setProducts(data);
        setUsingMock(false);
      }
    } catch (e) {
      // Offline / rural connectivity: fallback to mock per spec (offline queuing recommended)
      setError(e.message);
      // keep mockProducts filtered locally for demo-offline
      setUsingMock(true);
      const list = [...mockProducts];
      const q = (params.search || '').toLowerCase();
      let filtered = list;
      if (q) filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
      if (params.category && params.category !== 'all') filtered = filtered.filter((p) => String(p.category_id) === String(params.category) || p.category.toLowerCase() === String(params.category).toLowerCase());
      if (params.verified_only) filtered = filtered.filter((p) => p.farmer.verified);
      if (params.price_max) filtered = filtered.filter((p) => p.price_per_unit <= Number(params.price_max));
      setProducts(filtered);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query, activeCat, sort, verifiedOnly, priceMax]);

  useEffect(() => {
    getCategories().then((cats) => {
      if (Array.isArray(cats) && cats.length) {
        const mapped = [{ id: 'all', name: 'All', slug: 'all' }, ...cats.map((c) => ({ id: String(c.id), name: c.name, slug: c.slug }))];
        setCategories(mapped);
      }
    }).catch(() => {});
    fetchProducts();
  }, []);

  // refetch when filters change (debounced for search)
  useEffect(() => {
    const t = setTimeout(() => fetchProducts(), 400);
    return () => clearTimeout(t);
  }, [query, activeCat, sort, verifiedOnly, priceMax]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchProducts(); }, [fetchProducts]);

  const activeFilters = (verifiedOnly ? 1 : 0) + (priceMax ? 1 : 0);
  const displayProducts = products;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header — cooperative feel, not startup generic */}
      <View style={s.header}>
        <View>
          <Text style={s.eyebrow}>Deliver to</Text>
          <Text style={s.location}>Brgy. San Isidro, Cabanatuan ▾</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <NotificationBell onPress={() => navigation.navigate('Notifications')} />
          <Pressable onPress={() => navigation.navigate('Cart')} style={s.cartIcon}>
            <Text style={s.cartIconText}>🧺</Text>
            {count > 0 && <View style={s.countBadge}><Text style={s.countText}>{count}</Text></View>}
          </Pressable>
        </View>
      </View>

      <View style={s.searchWrap}>
        <SearchBar value={query} onChange={setQuery} onFilterPress={() => setShowFilters((v) => !v)} activeFiltersCount={activeFilters} />
        <CategoryChips categories={categories} activeId={activeCat} onSelect={setActiveCat} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {sorts.map((o) => (
            <Pressable key={o.id} onPress={() => setSort(o.id)} style={[s.sortChip, sort === o.id && s.sortActive]}>
              <Text style={[s.sortText, sort === o.id && s.sortTextActive]}>{o.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {showFilters && (
          <View style={s.filterPanel}>
            <Text style={s.filterTitle}>Filters</Text>
            <View style={s.filterRow}>
              <Pressable onPress={() => setVerifiedOnly((v) => !v)} style={[s.toggle, verifiedOnly && s.toggleOn]}>
                <Text style={[s.toggleText, verifiedOnly && s.toggleTextOn]}>{verifiedOnly ? '● ' : '○ '} Verified farms only</Text>
              </Pressable>
              <Pressable onPress={() => setPriceMax(priceMax ? null : 100)} style={[s.toggle, priceMax && s.toggleOn]}>
                <Text style={[s.toggleText, priceMax && s.toggleTextOn]}>Under ₱100/kg</Text>
              </Pressable>
            </View>
            <Text style={s.filterNote}>Filters apply instantly • no extra taps</Text>
          </View>
        )}
      </View>

      {loading && !refreshing && (
        <View style={s.loading}><ActivityIndicator color={colors.forestGreen} /><Text style={s.loadingText}>Loading harvests…</Text></View>
      )}
      {usingMock && <View style={s.offlineBanner}><Text style={s.offlineText}>Offline — showing cached harvests • will sync when connected</Text></View>}
      {error && !usingMock && <View style={s.errorBanner}><Text style={s.errorText}>{error}</Text></View>}

      <FlatList
        data={displayProducts}
        keyExtractor={(i) => String(i.id)}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.sm }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.forestGreen} />}
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { product: item })} onQuickAdd={add} />
          </View>
        )}
        ListHeaderComponent={
          <View style={s.trustWrap}>
            <Text style={s.trustText}>Cultivating Connection • Harvesting Fair Trades — direct from Nueva Ecija smallholders{usingMock ? ' • Offline cache' : ''}</Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? <View style={s.empty}><Text style={s.emptyText}>No harvests match “{query}”. Try gulay or bigas.</Text></View> : null
        }
      />

      {/* Floating cart bar — zero-friction, 44pt+ targets */}
      {count > 0 && (
        <View style={s.cartBar}>
          <View>
            <Text style={s.cartBarCount}>{count} items</Text>
            <Text style={s.cartBarTotal}>₱{total.toFixed(2)}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Cart')} style={s.cartBarCta}>
            <Text style={s.cartBarCtaText}>View basket →</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutralBg },
  header: {
    backgroundColor: colors.forestGreen, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  eyebrow: { ...typography.caption, color: 'rgba(255,255,255,0.7)' },
  location: { ...typography.bodyMedium, color: colors.white, marginTop: 2 },
  cartIcon: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  cartIconText: { fontSize: 18 },
  countBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.harvestGold, borderRadius: 999, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: colors.textPrimary },
  searchWrap: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.neutralBg },
  trustWrap: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.sm, marginBottom: spacing.sm },
  trustText: { ...typography.caption, color: colors.textMuted, textAlign: 'center', lineHeight: 16 },
  sortChip: { height: 32, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  sortActive: { backgroundColor: colors.harvestGoldLight, borderColor: '#E8D48A' },
  sortText: { ...typography.caption, fontFamily: 'Inter_500Medium', color: colors.textSecondary },
  sortTextActive: { color: colors.harvestGoldDark },
  filterPanel: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: 10 },
  filterTitle: { ...typography.headingSmall, color: colors.textPrimary },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  toggle: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  toggleOn: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  toggleText: { ...typography.caption, fontFamily: 'Inter_500Medium', color: colors.textSecondary },
  toggleTextOn: { color: colors.white },
  filterNote: { ...typography.caption, color: colors.textMuted },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  loadingText: { ...typography.caption, color: colors.textMuted },
  offlineBanner: { backgroundColor: colors.harvestGoldLight, borderRadius: radius.md, marginHorizontal: spacing.md, padding: 8, borderWidth: 1, borderColor: '#F2D98A' },
  offlineText: { ...typography.caption, color: colors.harvestGoldDark, textAlign: 'center', fontFamily: 'Inter_600SemiBold' },
  errorBanner: { backgroundColor: '#FDEDEC', borderRadius: radius.md, marginHorizontal: spacing.md, padding: 8, borderWidth: 1, borderColor: '#F5C6CB' },
  errorText: { ...typography.caption, color: colors.status.cancelled, textAlign: 'center' },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  cartBar: {
    position: 'absolute', bottom: 12, left: spacing.md, right: spacing.md, backgroundColor: colors.forestGreen,
    borderRadius: radius.md, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    boxShadow: '0px 6px 16px rgba(46, 83, 57, 0.20)', elevation: 8
  },
  cartBarCount: { ...typography.caption, color: 'rgba(255,255,255,0.8)' },
  cartBarTotal: { ...typography.price, color: colors.white },
  cartBarCta: { backgroundColor: colors.harvestGold, borderRadius: radius.pill, height: 44, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  cartBarCtaText: { ...typography.bodyMedium, color: colors.textPrimary },
});
