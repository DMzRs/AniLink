import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function QuantityStepper({ value, onDec, onInc, max, unit = 'kg', compact = false }) {
  const atMin = value <= 1;
  const atMax = max != null && value >= max;
  return (
    <View style={[s.wrap, compact && { height: 36 }]}>
      <Pressable onPress={onDec} disabled={atMin} style={[s.btn, atMin && s.disabled]}>
        <Text style={s.btnText}>−</Text>
      </Pressable>
      <View style={s.center}>
        <Text style={[s.value, compact && { fontSize: 16 }]}>{value}</Text>
        <Text style={s.unit}>{unit}</Text>
      </View>
      <Pressable onPress={onInc} disabled={atMax} style={[s.btn, s.btnPrimary, atMax && s.disabled]}>
        <Text style={[s.btnText, { color: colors.white }]}>+</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, height: 44, overflow: 'hidden'
  },
  btn: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutralBg },
  btnPrimary: { backgroundColor: colors.forestGreen },
  disabled: { opacity: 0.4 },
  btnText: { fontSize: 20, lineHeight: 20, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  value: { ...typography.heading, color: colors.textPrimary },
  unit: { ...typography.caption, color: colors.textMuted, marginTop: -2 },
});
