import React from 'react';
import { View, TextInput, StyleSheet, Pressable, Text } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function SearchBar({ value, onChange, onFilterPress, activeFiltersCount = 0 }) {
  return (
    <View style={s.wrap}>
      <View style={s.inputWrap}>
        <Text style={s.icon}>⌕</Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="Search gulay, prutas, bigas — e.g. 'kamatis'"
          placeholderTextColor={colors.textMuted}
          style={s.input}
          returnKeyType="search"
        />
      </View>
      <Pressable onPress={onFilterPress} style={s.filter}>
        <Text style={s.filterText}>Filters</Text>
        {activeFiltersCount > 0 && <View style={s.dot}><Text style={s.dotText}>{activeFiltersCount}</Text></View>}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 44, gap: 8
  },
  icon: { color: colors.textMuted, fontSize: 16 },
  input: { flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: 0 },
  filter: {
    height: 44, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.forestGreen,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6
  },
  filterText: { ...typography.bodyMedium, color: colors.white },
  dot: { backgroundColor: colors.harvestGold, borderRadius: 999, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: colors.textPrimary, fontFamily: 'Inter_700Bold', fontSize: 11, lineHeight: 14 },
});
