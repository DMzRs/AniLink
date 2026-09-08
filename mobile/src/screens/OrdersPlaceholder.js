import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

export default function OrdersPlaceholder() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Orders</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>Real-time queue comes after AniManage</Text>
        <Text style={s.cardText}>Pending → Confirmed → Preparing → Ready → Delivered/Completed. Wire to `orders` + `order_status_history` via Reverb.</Text>
        <View style={s.chips}><View style={[s.chip, { backgroundColor: colors.status.pending }]}><Text style={s.chipText}>Pending</Text></View><View style={[s.chip, { backgroundColor: colors.status.confirmed }]}><Text style={s.chipText}>Confirmed</Text></View><View style={[s.chip, { backgroundColor: colors.forestGreen }]}><Text style={s.chipText}>Ready</Text></View></View>
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
  chips: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: colors.white, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});
