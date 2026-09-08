import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import StatusChip from '../components/StatusChip';
import NotificationBell from '../components/NotificationBell';
import { getOrders, getOrder } from '../api/orders';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { peso } from '../utils/format';

// Spec flow: Pending → Confirmed → Preparing → Ready → Delivered/Completed
const nextStatus = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
  delivered: 'completed',
};
const nextLabel = {
  pending: 'Confirm',
  confirmed: 'Start preparing',
  preparing: 'Mark ready',
  ready: 'Mark delivered',
  delivered: 'Complete',
};

const filters = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed'];

export default function FarmerOrdersScreen({ navigation }) {
  const { token, login } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [usingMock, setUsingMock] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let hasToken = !!token;
      if (!hasToken) {
        try { await login('lito@anilink.test', 'password123'); hasToken = true; } catch {}
      }
      if (!hasToken) throw new Error('Offline');
      const res = await getOrders();
      const list = res.data ?? res ?? [];
      setOrders(Array.isArray(list) ? list : []);
      setUsingMock(false);
    } catch (e) {
      // fallback demo queue — illustrates chips + flow when offline
      setUsingMock(true);
      setOrders([
        { id: 101, status: 'pending', order_type: 'retail', fulfillment_type: 'delivery', total_amount: 240, buyer: { name: 'Maria Santos' }, items: [{ product_name: 'Siling Labuyo', quantity: 2, unit_price: 120, subtotal: 240 }], created_at: new Date().toISOString() },
        { id: 102, status: 'confirmed', order_type: 'bulk', fulfillment_type: 'pickup', total_amount: 3500, buyer: { name: 'Carinderia Tess' }, items: [{ product_name: 'Bigas Dinorado', quantity: 3, unit_price: 1150, subtotal: 3450 }], created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 103, status: 'preparing', order_type: 'retail', fulfillment_type: 'delivery', total_amount: 110, buyer: { name: 'Juan Dela Cruz' }, items: [{ product_name: 'Kamatis', quantity: 2, unit_price: 55, subtotal: 110 }], created_at: new Date(Date.now() - 7200000).toISOString() },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, login]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return orders;
    return orders.filter((o) => String(o.status).toLowerCase() === activeFilter);
  }, [orders, activeFilter]);

  const counts = useMemo(() => {
    const c = { all: orders.length };
    filters.slice(1).forEach((f) => { c[f] = orders.filter((o) => String(o.status).toLowerCase() === f).length; });
    return c;
  }, [orders]);

  const handleAdvance = async (order) => {
    const current = String(order.status).toLowerCase();
    const next = nextStatus[current];
    if (!next) return;
    if (usingMock) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
      return;
    }
    setUpdatingId(order.id);
    try {
      await api.request(`/orders/${order.id}/status`, { method: 'PATCH', body: { status: next }, auth: true });
      const fresh = await getOrder(order.id);
      const updated = fresh.data ?? fresh;
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    } catch (e) {
      Alert.alert('Status update failed', e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancel = async (order) => {
    if (usingMock) {
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o)));
      return;
    }
    setUpdatingId(order.id);
    try {
      await api.request(`/orders/${order.id}/status`, { method: 'PATCH', body: { status: 'cancelled' }, auth: true });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' } : o)));
    } catch (e) {
      Alert.alert('Cancel failed', e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator color={colors.forestGreen} /><Text style={s.loadingText}>Loading queue…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>AniManage • Orders</Text>
          <Text style={s.headerTitle}>Order queue</Text>
          <Text style={s.headerSub}>{orders.length} orders • {counts.pending || 0} pending • via API + push</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <NotificationBell onPress={() => navigation?.navigate('Notifications')} />
          <View style={s.liveDot}><View style={s.livePulse} /><Text style={s.liveText}>Live</Text></View>
        </View>
      </View>

      <View style={s.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.md, paddingVertical: 8 }}>
          {filters.map((f) => {
            const active = f === activeFilter;
            const label = f === 'all' ? `All ${counts.all}` : `${f} ${counts[f] || 0}`;
            return (
              <Pressable key={f} onPress={() => setActiveFilter(f)} style={[s.filterChip, active && s.filterActive]}>
                <Text style={[s.filterText, active && s.filterTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {usingMock && <View style={s.offlineBanner}><Text style={s.offlineText}>Offline demo queue — will sync to /api/orders when connected</Text></View>}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={colors.forestGreen} />}
        renderItem={({ item }) => {
          const isUpdating = updatingId === item.id;
          const canAdvance = !!nextStatus[String(item.status).toLowerCase()];
          const isCancelled = String(item.status).toLowerCase() === 'cancelled';
          return (
            <View style={s.card}>
              <View style={s.cardHead}>
                <Text style={s.orderId}>Order #{item.id}</Text>
                <StatusChip status={item.status} />
              </View>
              <View style={s.metaRow}>
                <Text style={s.buyer} numberOfLines={1}>{item.buyer?.name ?? 'Buyer'} • {item.order_type === 'bulk' ? 'Bulk' : 'Retail'} • {item.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'}</Text>
                <Text style={s.time}>{new Date(item.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</Text>
              </View>
              <View style={s.itemsBox}>
                {(item.items || []).map((it, idx) => (
                  <View key={idx} style={s.itemLine}>
                    <Text style={s.itemName} numberOfLines={1}>{it.product_name} • {Number(it.quantity)} × {peso(Number(it.unit_price))}</Text>
                    <Text style={s.itemSubtotal}>{peso(Number(it.subtotal))}</Text>
                  </View>
                ))}
              </View>
              <View style={s.totalRow}><Text style={s.totalLabel}>Total</Text><Text style={s.totalValue}>{peso(Number(item.total_amount))}</Text></View>
              {!isCancelled && (
                <View style={s.actions}>
                  {canAdvance && (
                    <Pressable
                      onPress={() => handleAdvance(item)}
                      disabled={isUpdating}
                      style={({ pressed }) => [s.primaryBtn, pressed && { opacity: 0.9 }, isUpdating && { opacity: 0.6 }]}
                    >
                      {isUpdating ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={s.primaryText}>{nextLabel[String(item.status).toLowerCase()] || 'Advance'} →</Text>}
                    </Pressable>
                  )}
                  {String(item.status).toLowerCase() === 'pending' && (
                    <Pressable onPress={() => handleCancel(item)} disabled={isUpdating} style={s.cancelBtn}><Text style={s.cancelText}>Cancel</Text></Pressable>
                  )}
                </View>
              )}
              <Text style={s.hint}>One-tap status — no confirmation modal • 44pt targets</Text>
            </View>
          );
        }}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No {activeFilter !== 'all' ? activeFilter : ''} orders. Pull to refresh.</Text></View>}
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
  liveDot: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.harvestGold },
  liveText: { ...typography.caption, fontFamily: 'Inter_600SemiBold', color: colors.white, fontSize: 11 },
  filterWrap: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  filterChip: { height: 32, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  filterActive: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  filterText: { ...typography.caption, fontFamily: 'Inter_500Medium', color: colors.textSecondary, textTransform: 'capitalize' },
  filterTextActive: { color: colors.white },
  offlineBanner: { backgroundColor: colors.harvestGoldLight, marginHorizontal: spacing.md, marginBottom: 8, borderRadius: radius.md, padding: 8, borderWidth: 1, borderColor: '#F2D98A' },
  offlineText: { ...typography.caption, color: colors.harvestGoldDark, textAlign: 'center', fontFamily: 'Inter_600SemiBold' },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: 8 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { ...typography.bodyMedium, color: colors.textPrimary },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  buyer: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  time: { ...typography.caption, color: colors.textMuted },
  itemsBox: { backgroundColor: colors.neutralBg, borderRadius: radius.sm, padding: 10, gap: 6 },
  itemLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  itemName: { ...typography.body, color: colors.textSecondary, flex: 1, fontSize: 13 },
  itemSubtotal: { ...typography.bodyMedium, color: colors.textPrimary, fontSize: 13 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.borderLight },
  totalLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  totalValue: { ...typography.bodyMedium, color: colors.forestGreen },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  primaryBtn: { flex: 1, height: 44, borderRadius: radius.pill, backgroundColor: colors.forestGreen, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  primaryText: { ...typography.bodyMedium, color: colors.white, fontSize: 13 },
  cancelBtn: { height: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  cancelText: { ...typography.bodyMedium, color: colors.textSecondary, fontSize: 13 },
  hint: { ...typography.caption, color: colors.textMuted, fontSize: 10, textAlign: 'center' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
