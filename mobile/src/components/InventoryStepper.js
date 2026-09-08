import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

// DESIGN.md: Stock stepper — large +/- buttons, current count in center, one-tap update, no modal required
// 44pt touch targets, bilingual-ready (unit labels short)
export default function InventoryStepper({ value, unit = 'kg', onChange, loading = false, lowStock = false }) {
  const [pendingDelta, setPendingDelta] = useState(null);

  const handle = async (delta) => {
    if (loading) return;
    setPendingDelta(delta);
    try {
      await onChange(delta);
    } finally {
      setPendingDelta(null);
    }
  };

  return (
    <View style={[s.wrap, lowStock && s.wrapLow]}>
      <Pressable
        onPress={() => handle(-1)}
        style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
        hitSlop={6}
        disabled={loading}
      >
        {pendingDelta === -1 ? <ActivityIndicator size="small" color={colors.textPrimary} /> : <Text style={s.btnText}>−</Text>}
      </Pressable>

      <View style={s.center}>
        {loading && pendingDelta === null ? <ActivityIndicator size="small" color={colors.forestGreen} /> : <Text style={[s.value, lowStock && s.valueLow]}>{value}</Text>}
        <Text style={s.unit}>{unit}</Text>
      </View>

      <Pressable
        onPress={() => handle(1)}
        style={({ pressed }) => [s.btn, s.btnPrimary, pressed && s.btnPressedPrimary]}
        hitSlop={6}
        disabled={loading}
      >
        {pendingDelta === 1 ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={[s.btnText, s.btnTextPrimary]}>+</Text>}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, height: 44, overflow: 'hidden',
  },
  wrapLow: { borderColor: '#E8C6C6' },
  btn: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutralBg },
  btnPrimary: { backgroundColor: colors.forestGreen },
  btnPressed: { backgroundColor: colors.borderLight },
  btnPressedPrimary: { opacity: 0.92 },
  btnText: { fontSize: 20, lineHeight: 20, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },
  btnTextPrimary: { color: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, minWidth: 72 },
  value: { ...typography.heading, color: colors.textPrimary, fontSize: 17 },
  valueLow: { color: colors.status.cancelled },
  unit: { ...typography.caption, color: colors.textMuted, marginTop: -2, fontSize: 10 },
});
