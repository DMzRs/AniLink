import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing, shadow } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getInsights } from '../api/predict';
import { getFarmerProducts } from '../api/inventory';
import { peso } from '../utils/format';

const DIRECTION_META = {
  rising: { arrow: '↑', label: 'Rising demand', color: colors.status.confirmed },
  falling: { arrow: '↓', label: 'Falling demand', color: colors.status.cancelled },
  steady: { arrow: '→', label: 'Steady demand', color: colors.harvestGoldDark },
};

// AniPredict — farmer-facing market insights per spec module 4:
// price trends, basic demand forecast, best time to sell, regional comparison.
export default function PredictScreen() {
  const [insights, setInsights] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchInsights = useCallback(async (catId) => {
    setLoading(true);
    try {
      const res = await getInsights(catId);
      setInsights(res);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Category picker options come from the farmer's own listings
    getFarmerProducts()
      .then((list) => {
        const arr = Array.isArray(list) ? list : (list?.data ?? []);
        const seen = new Map();
        arr.forEach((p) => { if (p.category && !seen.has(p.category.id)) seen.set(p.category.id, p.category.name); });
        setCategories([...seen.entries()].map(([id, name]) => ({ id, name })));
      })
      .catch(() => {});
    fetchInsights(null);
  }, [fetchInsights]);

  const pick = (id) => {
    setCategoryId(id);
    fetchInsights(id);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchInsights(categoryId);
  };

  const series = insights?.price_series ?? [];
  const bars = series.slice(-14); // last 14 points fit the strip
  const maxPrice = Math.max(...bars.map((b) => b.avg_price), 1);
  const demandMeta = DIRECTION_META[insights?.demand?.direction] ?? null;
  const regions = insights?.regional_comparison ?? [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>AniPredict</Text>
        <Text style={s.headerSub}>Market insights for your crops — price trends, demand, best time to sell</Text>
      </View>

      {categories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {categories.map((c) => (
            <Pressable key={c.id} onPress={() => pick(c.id)} style={[s.chip, categoryId === c.id && s.chipOn]}>
              <Text style={[s.chipText, categoryId === c.id && s.chipTextOn]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.forestGreen} />}
      >
        {loading ? (
          <View style={s.center}><ActivityIndicator color={colors.forestGreen} /></View>
        ) : error ? (
          <View style={s.card}><Text style={s.errorText}>{error}</Text></View>
        ) : !insights?.category ? (
          <View style={s.card}><Text style={s.mutedText}>Add a listing first — insights appear once you have a category to analyze.</Text></View>
        ) : (
          <>
            {/* Best time to sell — the headline recommendation */}
            {insights.best_time?.recommendation && (
              <View style={[s.card, s.goldCard]}>
                <Text style={s.cardEyebrow}>Best time to sell • {insights.category.name}</Text>
                <Text style={s.recommendation}>{insights.best_time.recommendation}</Text>
              </View>
            )}

            {/* Price trend — 30-day strip of the farmer's home province */}
            <View style={s.card}>
              <View style={s.rowBetween}>
                <Text style={s.cardEyebrow}>Price trend • 30 days</Text>
                <Text style={s.mutedText}>{insights.region ?? '—'}</Text>
              </View>
              {bars.length > 1 ? (
                <View style={s.barsRow}>
                  {bars.map((b) => (
                    <View key={b.date} style={s.barWrap}>
                      <View style={[s.bar, { height: Math.max(6, (b.avg_price / maxPrice) * 90) }]} />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={s.mutedText}>Not enough price history yet — it builds as your orders complete.</Text>
              )}
              {bars.length > 1 && (
                <Text style={s.mutedText}>
                  Latest avg: {peso(bars[bars.length - 1].avg_price)} / first: {peso(bars[0].avg_price)}
                </Text>
              )}
            </View>

            {/* Demand forecast */}
            <View style={s.card}>
              <Text style={s.cardEyebrow}>Demand forecast • 8 weeks</Text>
              {demandMeta ? (
                <View style={s.demandRow}>
                  <Text style={[s.demandArrow, { color: demandMeta.color }]}>{demandMeta.arrow}</Text>
                  <Text style={s.demandLabel}>{demandMeta.label}</Text>
                </View>
              ) : (
                <Text style={s.mutedText}>No order volume yet — demand reads as orders come in.</Text>
              )}
            </View>

            {/* Regional comparison */}
            {regions.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardEyebrow}>Regional comparison</Text>
                {regions.map((r) => (
                  <View key={r.region} style={s.regionRow}>
                    <Text style={[s.regionName, r.is_home && s.regionHome]}>{r.region}{r.is_home ? ' (you)' : ''}</Text>
                    <Text style={s.regionPrice}>{peso(r.avg_price)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutralBg },
  header: { backgroundColor: colors.forestGreen, padding: spacing.md, gap: 2 },
  headerTitle: { ...typography.heading, color: colors.white },
  headerSub: { ...typography.caption, color: 'rgba(255,255,255,0.8)' },
  chips: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: 8 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  chipText: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.textSecondary },
  chipTextOn: { color: colors.white },
  center: { padding: 40, alignItems: 'center' },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: 8, ...shadow.card },
  goldCard: { backgroundColor: colors.harvestGoldLight, borderColor: '#F2D98A' },
  cardEyebrow: { ...typography.label, color: colors.textMuted },
  recommendation: { ...typography.bodyMedium, color: colors.textPrimary, lineHeight: 22 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 92 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '72%', backgroundColor: colors.forestGreen, borderRadius: 3 },
  demandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  demandArrow: { fontSize: 28, fontFamily: 'Poppins_700Bold' },
  demandLabel: { ...typography.bodyMedium, color: colors.textPrimary },
  regionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  regionName: { ...typography.body, color: colors.textSecondary },
  regionHome: { color: colors.forestGreen, fontFamily: 'Poppins_600SemiBold' },
  regionPrice: { ...typography.bodyMedium, color: colors.textPrimary },
  mutedText: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  errorText: { ...typography.caption, color: colors.status.cancelled },
});
