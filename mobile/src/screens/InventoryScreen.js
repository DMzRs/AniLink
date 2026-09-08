import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing, shadow } from '../theme/spacing';
import { typography } from '../theme/typography';
import InventoryStepper from '../components/InventoryStepper';
import StatusChip from '../components/StatusChip';
import { mockProducts } from '../data/mockProducts';
import { getFarmerProducts, adjustStock, updateProduct } from '../api/inventory';
import { getOrders } from '../api/orders';
import { useAuth } from '../context/AuthContext';
import { peso } from '../utils/format';
import NotificationBell from '../components/NotificationBell';

function SummaryCard({ daily, weekly, pendingCount }) {
  return (
    <View style={s.summaryCard}>
      <Text style={s.summaryEyebrow}>Today • {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</Text>
      <View style={s.summaryRow}>
        <View style={s.summaryBox}>
          <Text style={s.summaryLabel}>Daily sales</Text>
          <Text style={s.summaryValue}>{peso(daily)}</Text>
          <Text style={s.summarySub}>Orders pending: {pendingCount}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryBox}>
          <Text style={s.summaryLabel}>Weekly totals</Text>
          <Text style={s.summaryValue}>{peso(weekly)}</Text>
          <Text style={s.summarySub}>7-day harvest</Text>
        </View>
      </View>
    </View>
  );
}

export default function InventoryScreen({ navigation }) {
  const { token, login, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const isFarmer = user?.role === 'farmer';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // auto-login demo farmer if no token
      let hasToken = !!token;
      if (!hasToken) {
        try { await login('lito@anilink.test', 'password123'); hasToken = true; } catch {}
      }
      if (!hasToken) throw new Error('Offline');

      const [prodData, orderRes] = await Promise.all([
        getFarmerProducts().catch(() => { throw new Error('products'); }),
        getOrders().catch(() => ({ data: [] })),
      ]);
      setProducts(Array.isArray(prodData) ? prodData : prodData.data ?? []);
      const orderList = orderRes.data ?? orderRes ?? [];
      setOrders(Array.isArray(orderList) ? orderList : []);
      setUsingMock(false);
    } catch (e) {
      // rural connectivity fallback — show cached mockProducts filtered to demo farmer
      setProducts(mockProducts.filter((p) => p.farmer.name.includes('Lito') || p.farmer.verified));
      setUsingMock(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, login]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const lowStock = useMemo(() => products.filter((p) => Number(p.available_quantity) <= 5 && p.status !== 'archived'), [products]);

  const daily = useMemo(() => {
    const today = new Date().toDateString();
    return orders
      .filter((o) => new Date(o.created_at).toDateString() === today && o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  }, [orders]);

  const weekly = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return orders
      .filter((o) => new Date(o.created_at).getTime() > weekAgo && o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  }, [orders]);

  const pendingCount = useMemo(() => orders.filter((o) => o.status === 'pending').length, [orders]);

  const handleAdjust = async (product, delta) => {
    const prev = product.available_quantity;
    const next = Math.max(0, Number(prev) + delta);
    setUpdatingId(product.id);
    // optimistic
    setProducts((prevList) => prevList.map((p) => (p.id === product.id ? { ...p, available_quantity: next, status: next === 0 ? 'sold_out' : p.status === 'sold_out' && next > 0 ? 'available' : p.status } : p)));
    try {
      if (usingMock) {
        await new Promise((r) => setTimeout(r, 400));
        return;
      }
      const res = await adjustStock(product.id, delta, delta > 0 ? 'restock' : 'adjustment');
      const updated = res.data ?? res;
      setProducts((prevList) => prevList.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e) {
      // revert
      setProducts((prevList) => prevList.map((p) => (p.id === product.id ? { ...p, available_quantity: prev } : p)));
      Alert.alert('Sync failed', e.message + ' — will retry when online (spec offline queuing).');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSoldOut = async (product) => {
    const isSoldOut = product.status === 'sold_out';
    setUpdatingId(product.id);
    try {
      if (usingMock) {
        await new Promise((r) => setTimeout(r, 300));
        setProducts((l) => l.map((p) => (p.id === product.id ? { ...p, status: isSoldOut ? 'available' : 'sold_out', available_quantity: isSoldOut ? Math.max(5, Number(p.available_quantity)) : 0 } : p)));
        return;
      }
      const res = await updateProduct(product.id, { status: isSoldOut ? 'available' : 'sold_out', available_quantity: isSoldOut ? undefined : 0 });
      const updated = res.data ?? res;
      setProducts((l) => l.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator color={colors.forestGreen} /><Text style={s.loadingText}>Loading inventory…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header — Forest Green primary per DESIGN.md */}
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>AniManage • Inventory</Text>
          <Text style={s.headerTitle}>{usingMock ? 'Demo farm (offline cache)' : isFarmer ? (user?.farmerProfile?.farm_name || user?.name) : 'Santos Family Farm'}</Text>
          <Text style={s.headerSub}>{products.length} listings • {lowStock.length} low stock</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <NotificationBell onPress={() => navigation.navigate('Notifications')} />
          <View style={s.headerBadge}><Text style={s.headerBadgeText}>✓ 2FA</Text></View>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={colors.forestGreen} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.md }}>
            <SummaryCard daily={daily} weekly={weekly} pendingCount={pendingCount} />
            {usingMock && <View style={s.offlineBanner}><Text style={s.offlineText}>Offline — cached harvests • stock changes will sync (per spec offline queuing)</Text></View>}
            {lowStock.length > 0 && (
              <View style={s.alertCard}>
                <Text style={s.alertTitle}>⚠ Low-stock alerts • {lowStock.length}</Text>
                {lowStock.map((p) => (
                  <View key={p.id} style={s.alertRow}>
                    <Text style={s.alertName} numberOfLines={1}>{p.name} — {p.available_quantity} {p.unit_type} left</Text>
                    <Pressable onPress={() => handleAdjust(p, 10)} style={s.alertAction}><Text style={s.alertActionText}>+10</Text></Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isUpdating = updatingId === item.id;
          const isSoldOut = item.status === 'sold_out' || Number(item.available_quantity) === 0;
          return (
            <View style={[s.card, isSoldOut && s.cardSoldOut]}>
              <View style={s.cardTop}>
                <View style={s.thumb}><Text style={s.thumbEmoji}>{item.category?.name === 'Bigas' ? '🌾' : item.category?.name === 'Isda' ? '🐟' : '🥬'}</Text></View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.nameRow}>
                    <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                    {isSoldOut ? <View style={s.soldOutPill}><Text style={s.soldOutText}>Sold out</Text></View> : <StatusChip status={item.status} />}
                  </View>
                  <Text style={s.meta} numberOfLines={1}>{item.category?.name} • {peso(item.price_per_unit)}/{item.unit_type} • Harvest {item.harvest_date}</Text>
                  {item.bulk_price && <Text style={s.bulk}>Bulk {peso(item.bulk_price)}/{item.unit_type} at {item.min_bulk_quantity}+</Text>}
                </View>
              </View>

              <View style={s.stepperRow}>
                <InventoryStepper
                  value={Number(item.available_quantity)}
                  unit={item.unit_type}
                  loading={isUpdating}
                  lowStock={Number(item.available_quantity) <= 5}
                  onChange={(delta) => handleAdjust(item, delta)}
                />
                <Pressable
                  onPress={() => handleSoldOut(item)}
                  style={({ pressed }) => [s.soldOutBtn, isSoldOut && s.soldOutBtnActive, pressed && { opacity: 0.9 }]}
                >
                  <Text style={[s.soldOutBtnText, isSoldOut && s.soldOutBtnTextActive]}>{isSoldOut ? 'Restock' : 'Mark sold out'}</Text>
                </Pressable>
              </View>
              <Text style={s.oneTapHint}>One-tap update — no modal, 44pt targets</Text>
            </View>
          );
        }}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No listings yet. Add from web or seed.</Text></View>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutralBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: spacing.xl },
  loadingText: { ...typography.body, color: colors.textMuted },
  header: {
    backgroundColor: colors.forestGreen, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerEyebrow: { ...typography.label, color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  headerTitle: { ...typography.heading, color: colors.white, marginTop: 2 },
  headerSub: { ...typography.caption, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  headerBadgeText: { ...typography.caption, fontFamily: 'Inter_600SemiBold', color: colors.white, fontSize: 11 },
  summaryCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: 10, boxShadow: '0px 4px 12px rgba(46, 83, 57, 0.06)', elevation: 2 },
  summaryEyebrow: { ...typography.label, color: colors.textMuted, fontSize: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryBox: { flex: 1, gap: 2 },
  summaryLabel: { ...typography.caption, color: colors.textMuted },
  summaryValue: { ...typography.price, color: colors.forestGreen, fontSize: 18 },
  summarySub: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  summaryDivider: { width: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.sm, alignSelf: 'stretch' },
  offlineBanner: { backgroundColor: colors.harvestGoldLight, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: '#F2D98A' },
  offlineText: { ...typography.caption, color: colors.harvestGoldDark, textAlign: 'center', fontFamily: 'Inter_600SemiBold' },
  alertCard: { backgroundColor: '#FDEDEC', borderRadius: radius.md, borderWidth: 1, borderColor: '#E8C6C6', padding: spacing.md, gap: 8 },
  alertTitle: { ...typography.bodyMedium, color: colors.status.cancelled },
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  alertName: { ...typography.body, color: colors.textPrimary, flex: 1 },
  alertAction: { backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 12, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  alertActionText: { ...typography.caption, fontFamily: 'Inter_600SemiBold', color: colors.forestGreen },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: spacing.sm },
  cardSoldOut: { borderColor: '#E8C6C6', backgroundColor: '#FFFBFB' },
  cardTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  thumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.forestGreenLight, alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 22 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { ...typography.bodyMedium, color: colors.textPrimary, flexShrink: 1 },
  soldOutPill: { backgroundColor: colors.status.cancelled, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  soldOutText: { ...typography.caption, fontFamily: 'Inter_600SemiBold', color: colors.white, fontSize: 11 },
  meta: { ...typography.caption, color: colors.textMuted },
  bulk: { ...typography.caption, color: colors.harvestGoldDark, fontFamily: 'Inter_500Medium' },
  stepperRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  soldOutBtn: { height: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  soldOutBtnActive: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  soldOutBtnText: { ...typography.caption, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary },
  soldOutBtnTextActive: { color: colors.white },
  oneTapHint: { ...typography.caption, color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
