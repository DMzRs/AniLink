import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function TrustBadgeRow() {
  return (
    <View style={s.row}>
      <View style={s.badge}><Text style={s.dot}>✓</Text><Text style={s.text}>Verified farmer</Text></View>
      <View style={s.badge}><Text style={s.dot}>◉</Text><Text style={s.text}>2FA secured</Text></View>
      <View style={s.badge}><Text style={s.dot}>◆</Text><Text style={s.text}>Fair trade</Text></View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  dot: { color: colors.forestGreen, fontSize: 10 },
  text: { ...typography.caption, color: colors.textSecondary, fontFamily: 'Poppins_500Medium' },
});
