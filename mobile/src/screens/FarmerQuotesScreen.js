import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getFarmerQuotes, respondToQuote } from '../api/quotes';
import { peso } from '../utils/format';

// Farmer side of B2B quotes: reply with a price or decline (one round).
export default function FarmerQuotesScreen() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState({});
  const [busyId, setBusyId] = useState(null);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFarmerQuotes();
      setQuotes(res.quotes ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const respond = async (id, payload) => {
    setBusyId(id);
    try {
      await respondToQuote(id, payload);
      await fetchQuotes();
    } catch (e) {} finally {
      setBusyId(null);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Bulk quote requests</Text>
        <Text style={s.headerSub}>B2B buyers asking for your best price</Text>
      </View>
      <FlatList
        data={quotes}
        keyExtractor={(q) => String(q.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={fetchQuotes} tintColor={colors.forestGreen} />}
        ListEmptyComponent={!loading && <View style={s.empty}><Text style={s.emptyText}>No quote requests yet.</Text></View>}
        renderItem={({ item: q }) => (
          <View style={s.card}>
            <View style={s.head}>
              <Text style={s.title}>{q.quantity} {q.product?.unit_type} · {q.product?.name}</Text>
              <Text style={[s.status, q.status === 'pending' && { color: colors.harvestGoldDark }, q.status === 'quoted' && { color: colors.status.confirmed }, q.status === 'declined' && { color: colors.status.cancelled }]}>{q.status}</Text>
            </View>
            <Text style={s.meta}>From {q.buyer?.name || '—'} • your listing: {peso(q.product?.price_per_unit ?? 0)}/{q.product?.unit_type}{q.product?.bulk_price ? ` • bulk ${peso(q.product.bulk_price)}` : ''}</Text>
            {q.message ? <Text style={s.message}>“{q.message}”</Text> : null}
            {q.status === 'quoted' && <Text style={s.quoted}>Quoted {peso(q.quoted_unit_price)} — waiting for the buyer.</Text>}
            {q.status === 'pending' && (
              <View style={s.respondBox}>
                <TextInput
                  style={s.priceInput}
                  placeholder="Your price / unit"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  value={prices[q.id] ?? ''}
                  onChangeText={(t) => setPrices((s0) => ({ ...s0, [q.id]: t.replace(/[^0-9.]/g, '') }))}
                />
                <Pressable
                  onPress={() => respond(q.id, { action: 'quote', quoted_unit_price: Number(prices[q.id]) })}
                  disabled={busyId === q.id || !prices[q.id]}
                  style={[s.btnPrimary, (!prices[q.id] || busyId === q.id) && { opacity: 0.5 }]}
                >
                  {busyId === q.id ? <ActivityIndicator color={colors.white} /> : <Text style={s.btnPrimaryText}>Send quote</Text>}
                </Pressable>
                <Pressable onPress={() => respond(q.id, { action: 'decline' })} disabled={busyId === q.id} style={s.btnGhost}>
                  <Text style={s.btnGhostText}>Decline</Text>
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
  message: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },
  quoted: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.status.confirmed },
  respondBox: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  priceInput: { flex: 1, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: spacing.sm, ...typography.caption, color: colors.textPrimary },
  btnPrimary: { height: 40, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.forestGreen, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.white },
  btnGhost: { height: 40, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  btnGhostText: { ...typography.caption, color: colors.textSecondary },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
