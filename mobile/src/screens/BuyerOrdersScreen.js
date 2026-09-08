import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import StatusChip from '../components/StatusChip';
import { getOrders } from '../api/orders';
import { useAuth } from '../context/AuthContext';
import { peso } from '../utils/format';

export default function BuyerOrdersScreen() {
  const { token, login } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingMock, setUsingMock] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let hasToken = !!token;
      if (!hasToken) {
        try { await login('buyer@anilink.test', 'password123'); hasToken = true; } catch {}
      }
      if (!hasToken) throw new Error('Offline');
      const res = await getOrders();
      const list = res.data ?? res ?? [];
      setOrders(Array.isArray(list) ? list : []);
      setUsingMock(false);
    } catch {
      setUsingMock(true);
      setOrders([
        { id: 201, status: 'confirmed', order_type: 'retail', fulfillment_type: 'delivery', total_amount: 195, items: [{ product_name: 'Kamatis', quantity: 2, unit_price: 55 }], created_at: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, login]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={colors.forestGreen} /><Text style={s.loadingText}>Loading orders…</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Your orders</Text>
        <Text style={s.headerSub}>{orders.length} orders • real-time updates via Reverb (future)</Text>
      </View>
      {usingMock && <View style={s.offlineBanner}><Text style={s.offlineText}>Offline demo • will sync to /api/orders</Text></View>}
      <FlatList
        data={orders}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={colors.forestGreen} />}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.head}><Text style={s.orderId}>Order #{item.id}</Text><StatusChip status={item.status} /></View>
            <Text style={s.meta}>{item.order_type === 'bulk' ? 'Bulk' : 'Retail'} • {item.fulfillment_type} • {peso(Number(item.total_amount))}</Text>
            <Text style={s.meta}>{new Date(item.created_at).toLocaleString('en-PH')}</Text>
          </View>
        )}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No orders yet — add from AniMarket.</Text></View>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutralBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { ...typography.body, color: colors.textMuted },
  header: { backgroundColor: colors.forestGreen, padding: spacing.md, gap: 2 },
  headerTitle: { ...typography.heading, color: colors.white },
  headerSub: { ...typography.caption, color: 'rgba(255,255,255,0.8)' },
  offlineBanner: { backgroundColor: colors.harvestGoldLight, margin: spacing.md, borderRadius: radius.md, padding: 8, borderWidth: 1, borderColor: '#F2D98A' },
  offlineText: { ...typography.caption, color: colors.harvestGoldDark, textAlign: 'center', fontFamily: 'Inter_600SemiBold' },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { ...typography.bodyMedium, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textMuted },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted },
});
