import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

export default function PredictPlaceholder() {
  return (
    <View style={s.container}>
      <Text style={s.title}>AniPredict</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>Best time to sell — after orders flow</Text>
        <Text style={s.cardText}>Wired to `price_trends` + order volume. Intentionally last per build order — needs real data. Harvest Gold marks the sell window on muted gridlines.</Text>
        <View style={s.chart}><View style={s.bar} /><View style={[s.bar, { height: 18, backgroundColor: colors.harvestGold }]} /><View style={[s.bar, { height: 26 }]} /><View style={[s.bar, { height: 22 }]} /></View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutralBg, padding: spacing.md, gap: spacing.md, justifyContent: 'center' },
  title: { ...typography.headingLarge, color: colors.textPrimary, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: 8 },
  cardTitle: { ...typography.headingSmall, color: colors.textPrimary },
  cardText: { ...typography.body, color: colors.textMuted, lineHeight: 20 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 40, marginTop: 8 },
  bar: { flex: 1, backgroundColor: colors.forestGreenLight, borderRadius: 6, height: 12 },
});
