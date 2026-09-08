import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/spacing';
import { typography } from '../theme/typography';

// DESIGN.md order states → exact colors, pill-shaped
const map = {
  pending: { bg: colors.status.pending, label: 'Pending' },
  confirmed: { bg: colors.status.confirmed, label: 'Confirmed' },
  preparing: { bg: colors.status.confirmed, label: 'Preparing' },
  ready: { bg: colors.status.ready, label: 'Ready' },
  delivered: { bg: colors.status.ready, label: 'Delivered' },
  completed: { bg: colors.status.ready, label: 'Completed' },
  cancelled: { bg: colors.status.cancelled, label: 'Cancelled' },
};

export default function StatusChip({ status }) {
  const key = String(status || '').toLowerCase();
  const entry = map[key] || { bg: colors.textMuted, label: status || '—' };
  const isGold = key === 'pending';
  return (
    <View style={[s.chip, { backgroundColor: entry.bg }]}>
      <Text style={[s.text, isGold && { color: colors.textPrimary }]}>{entry.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  chip: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  text: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.white, fontSize: 11, letterSpacing: 0.3 },
});
