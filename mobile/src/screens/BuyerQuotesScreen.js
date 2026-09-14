import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getMyQuotes, acceptQuote, withdrawQuote } from '../api/quotes';
import { peso } from '../utils/format';

const STATUS_COLORS = {
  pending: colors.harvestGoldDark,
  quoted: colors.status.confirmed,
  accepted: colors.forestGreen,
  declined: colors.status.cancelled,
  withdrawn: colors.textMuted,
};

// Business buyer's bulk quote requests — accept a farmer's price or withdraw.
export default function BuyerQuotesScreen() {
  const navigation = useNavigation();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyQuotes();
      setQuotes(res.quotes ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const act = async (id, fn) => {
    setBusyId(id);
    try {
      await fn();
      await fetchQuotes();
    } catch (e) {} finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Bulk quotes</Text>
        <Text style={s.headerSub}>Accept a farmer's price to place the order</Text>
      </View>
      <FlatList
        data={quotes}
        keyExtractor={(q) => String(q.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={!loading && false} onRefresh={fetchQuotes} tintColor={colors.forestGreen} />}
        ListEmptyComponent={!loading && <View style={s.empty}><Text style={s.emptyText}>No quote requests yet — open a listing and tap “Request bulk quote”.</Text></View>}
        renderItem={({ item: q }) => (
          <View style={s.card}>
            <View style={s.head}>
              <Text style={s.title}>{q.quantity} {q.product?.unit_type} · {q.product?.name}</Text>
              <Text style={[s.status, { color: STATUS_COLORS[q.status] ?? colors.textMuted }]}>{q.status}</Text>
            </View>
            <Text style={s.meta}>From {q.farmer?.farm_name || q.farmer?.name || '—'} • listing {peso(q.product?.price_per_unit ?? 0)}/{q.product?.unit_type}</Text>
            {q.message ? <Text style={s.meta}>“{q.message}”</Text> : null}
            {q.status === 'quoted' && (
              <Text style={s.quoteLine}>Farmer's price: {peso(q.quoted_unit_price)}/{q.product?.unit_type} — total ≈ {peso((q.quoted_unit_price ?? 0) * q.quantity)}{q.response_note ? ` • ${q.response_note}` : ''}</Text>
            )}
            {(q.status === 'quoted' || q.status === 'pending') && (
              <View style={s.actions}>
                {q.status === 'quoted' && (
                  <Pressable onPress={() => act(q.id, () => acceptQuote(q.id, 'pickup'))} disabled={busyId === q.id} style={s.btnPrimary}>
                    {busyId === q.id ? <ActivityIndicator color={colors.white} /> : <Text style={s.btnPrimaryText}>Accept — pickup</Text>}
                  </Pressable>
                )}
                <Pressable onPress={() => act(q.id, () => withdrawQuote(q.id))} disabled={busyId === q.id} style={s.btnGhost}>
                  <Text style={s.btnGhostText}>Withdraw</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutralBg },
  header: { backgroundColor: colors.forestGreen, padding: spacing.md, gap: 2 },
  headerTitle: { ...typography.heading, color: colors.white },
  headerSub: { ...typography.caption, color: 'rgba(255,255,255,0.8)' },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { ...typography.bodyMedium, color: colors.textPrimary, flex: 1, flexWrap: 'wrap' },
  status: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', textTransform: 'capitalize' },
  meta: { ...typography.caption, color: colors.textMuted },
  quoteLine: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.forestGreen, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnPrimary: { flex: 1, height: 40, borderRadius: radius.pill, backgroundColor: colors.forestGreen, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.white },
  btnGhost: { flex: 1, height: 40, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  btnGhostText: { ...typography.caption, color: colors.textSecondary },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
