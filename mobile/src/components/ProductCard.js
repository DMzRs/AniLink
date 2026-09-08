import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { colors } from '../theme/colors';
import { radius, shadow, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { distanceLabel, peso, perUnit } from '../utils/format';

function VerifiedBadge() {
  return (
    <View style={s.badge}>
      <Text style={s.badgeDot}>●</Text>
      <Text style={s.badgeText}>Verified</Text>
    </View>
  );
}

export default function ProductCard({ product, onPress, onQuickAdd }) {
  const lowStock = product.available_quantity <= 5;
  const categoryLabel = typeof product.category === 'string' ? product.category : product.category?.name ?? product.category?.slug ?? '';
  const categoryKey = categoryLabel;
  const imageUrl = product.image || product.images?.[0]?.url || null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && s.pressed]}>
      {/* Low-bandwidth first: show real image if uploaded, else lightweight placeholder */}
      <View style={s.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={s.imagePlaceholder}>
            <Text style={s.imageEmoji}>{categoryKey === 'Bigas' ? '🌾' : categoryKey === 'Isda' ? '🐟' : categoryKey === 'Prutas' ? '🥭' : categoryKey === 'Herbs' ? '🌿' : '🥬'}</Text>
            <Text style={s.imageLabel}>{categoryLabel} • Harvest {product.harvest_date}</Text>
          </View>
        )}
        {lowStock && (
          <View style={s.lowStockChip}>
            <Text style={s.lowStockText}>Only {product.available_quantity} left</Text>
          </View>
        )}
        {product.bulk_price && (
          <View style={s.bulkRibbon}>
            <Text style={s.bulkRibbonText}>Bulk {peso(product.bulk_price)}/{product.unit_type}</Text>
          </View>
        )}
      </View>

      <View style={s.body}>
        <Text style={s.name} numberOfLines={2}>{product.name}</Text>
        <Text style={s.price}>{perUnit(product.price_per_unit, product.unit_type)}</Text>
        <View style={s.farmerRow}>
          <Text style={s.farmer} numberOfLines={1}>{product.farmer.farm_name}</Text>
          {product.farmer.verified && <VerifiedBadge />}
        </View>
        <Text style={s.location} numberOfLines={1}>
          {product.farmer.barangay} • {distanceLabel(product.farmer.distance_km)}
        </Text>
        <View style={s.metaRow}>
          <Text style={s.rating}>★ {Number(product.rating ?? 0).toFixed(1)} · {product.reviews ?? 0}</Text>
          <Text style={s.fresh}>Fresh • {categoryLabel}</Text>
        </View>
      </View>

      <Pressable
        onPress={(e) => { e.stopPropagation(); onQuickAdd?.(product); }}
        hitSlop={8}
        style={({ pressed }) => [s.quickAdd, pressed && { backgroundColor: colors.forestGreen }]}
      >
        <Text style={s.quickAddText}>+ Add</Text>
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    flex: 1,
    ...shadow.card,
  },
  pressed: { opacity: 0.96, transform: [{ scale: 0.998 }] },
  imageWrap: { height: 132, backgroundColor: colors.neutralBg, position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  imageEmoji: { fontSize: 28 },
  imageLabel: { ...typography.caption, color: colors.textMuted },
  lowStockChip: {
    position: 'absolute', top: spacing.sm, left: spacing.sm,
    backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.border
  },
  lowStockText: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.status.cancelled, fontSize: 11 },
  bulkRibbon: {
    position: 'absolute', bottom: spacing.sm, right: spacing.sm,
    backgroundColor: colors.harvestGoldLight, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#F2D98A'
  },
  bulkRibbonText: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.harvestGoldDark, fontSize: 11 },
  body: { padding: spacing.sm, gap: 4 },
  name: { ...typography.headingSmall, color: colors.textPrimary },
  price: { ...typography.price, color: colors.forestGreen },
  farmerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  farmer: { ...typography.caption, color: colors.textSecondary, flexShrink: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.forestGreenLight, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  badgeDot: { color: colors.forestGreen, fontSize: 8, marginTop: -1 },
  badgeText: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.forestGreen, fontSize: 10 },
  location: { ...typography.caption, color: colors.textMuted },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  rating: { ...typography.caption, color: colors.textMuted },
  fresh: { ...typography.caption, color: colors.forestGreenSoft, fontFamily: 'Poppins_600SemiBold' },
  quickAdd: {
    margin: spacing.sm, marginTop: 0, backgroundColor: colors.forestGreen, borderRadius: radius.pill, height: 44, alignItems: 'center', justifyContent: 'center'
  },
  quickAddText: { ...typography.bodyMedium, color: colors.white },
});
