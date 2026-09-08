import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function CategoryChips({ categories, activeId, onSelect }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: spacing.md }}>
      {categories.map((c) => {
        const active = c.id === activeId;
        return (
          <Pressable key={c.id} onPress={() => onSelect(c.id)} style={[s.chip, active && s.active]}>
            <Text style={[s.text, active && s.textActive]}>{c.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  chip: {
    height: 36, paddingHorizontal: 16, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  active: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  text: { ...typography.bodyMedium, color: colors.textSecondary },
  textActive: { color: colors.white },
});
