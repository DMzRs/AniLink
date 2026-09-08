import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing, shadow } from '../theme/spacing';
import { typography } from '../theme/typography';
import QuantityStepper from '../components/QuantityStepper';
import TrustBadgeRow from '../components/TrustBadgeRow';
import { useCart } from '../context/CartContext';
import { peso } from '../utils/format';

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;
  const [qty, setQty] = useState(1);
  const [type, setType] = useState('retail'); // retail | bulk
  const { add, unitPriceFor } = useCart();
  const unitPrice = unitPriceFor(product, qty, type);
  const canBulk = product.bulk_price && product.min_bulk_quantity;
  const bulkActive = type === 'bulk' && qty >= product.min_bulk_quantity;
  const lowStock = product.available_quantity <= 5;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero — low-bandwidth placeholder, not a heavy image */}
        <View style={s.hero}>
          <View style={s.heroPlaceholder}>
            <Text style={s.heroEmoji}>{product.category === 'Bigas' ? '🌾' : product.category === 'Isda' ? '🐟' : '🥬'}</Text>
            <Text style={s.heroLabel}>{product.name} • {product.category}</Text>
            <Text style={s.heroSub}>Harvest {product.harvest_date} • Photo loads on Wi-Fi to save data</Text>
          </View>
          <Pressable onPress={() => navigation.goBack()} style={s.back}><Text style={s.backText}>‹ Back</Text></Pressable>
          {lowStock && <View style={s.stockPill}><Text style={s.stockPillText}>Only {product.available_quantity} left</Text></View>}
        </View>

        <View style={s.body}>
          <Text style={s.name}>{product.name}</Text>
          <View style={s.priceRow}>
            <Text style={s.price}>{peso(unitPrice)} <Text style={s.perUnit}>/ {product.unit_type}</Text></Text>
            {bulkActive && <View style={s.bulkSave}><Text style={s.bulkSaveText}>Bulk save {peso(product.price_per_unit - unitPrice)}/{product.unit_type}</Text></View>}
          </View>
          {canBulk && (
            <View style={s.toggleRow}>
              <Pressable onPress={() => setType('retail')} style={[s.toggle, type === 'retail' && s.toggleOn]}><Text style={[s.toggleText, type === 'retail' && s.toggleTextOn]}>Retail</Text></Pressable>
              <Pressable onPress={() => setType('bulk')} style={[s.toggle, type === 'bulk' && s.toggleOn]}><Text style={[s.toggleText, type === 'bulk' && s.toggleTextOn]}>Bulk — {product.min_bulk_quantity}+ {product.unit_type} @ {peso(product.bulk_price)}</Text></Pressable>
            </View>
          )}
          <Text style={s.desc}>{product.description}</Text>

          {/* Farmer card — trust signal */}
          <View style={s.farmerCard}>
            <View style={s.farmerHead}>
              <View style={s.avatar}><Text style={s.avatarText}>{product.farmer.name.split(' ').map((w) => w[0]).join('').slice(0,2)}</Text></View>
              <View style={{ flex: 1 }}>
                <View style={s.farmerNameRow}><Text style={s.farmerName}>{product.farmer.name}</Text>{product.farmer.verified && <View style={s.verified}><Text style={s.verifiedText}>✓ Verified</Text></View>}</View>
                <Text style={s.farmerFarm}>{product.farmer.farm_name} • {product.farmer.barangay}, {product.farmer.municipality}</Text>
                <Text style={s.farmerMeta}>★ {product.rating.toFixed(1)} · {product.reviews} reviews • {product.farmer.distance_km} km away</Text>
              </View>
            </View>
            <TrustBadgeRow />
          </View>

          {/* Quantity — large 44pt targets */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Quantity</Text>
            <QuantityStepper value={qty} onDec={() => setQty((v) => Math.max(1, v - 1))} onInc={() => setQty((v) => Math.min(product.available_quantity, v + 1))} max={product.available_quantity} unit={product.unit_type} />
            <Text style={s.stockNote}>{product.available_quantity} {product.unit_type} available • {product.unit_type === 'kg' ? 'We weigh at pickup' : 'Packed today'}</Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionLabel}>Subtotal</Text>
            <Text style={s.subtotal}>{peso(unitPrice * qty)} <Text style={s.subtotalQty}>for {qty} {product.unit_type}</Text></Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTA — Harvest Gold accent only here, Forest Green is primary system */}
      <View style={s.ctaBar}>
        <View style={s.ctaPriceWrap}><Text style={s.ctaLabel}>Total</Text><Text style={s.ctaPrice}>{peso(unitPrice * qty)}</Text></View>
        <Pressable
          onPress={() => { add(product, qty); navigation.navigate('Cart'); }}
          style={({ pressed }) => [s.cta, pressed && { opacity: 0.9 }]}
        >
          <Text style={s.ctaText}>Add to basket — {qty} {product.unit_type}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutralBg },
  hero: { height: 220, backgroundColor: colors.forestGreenLight, position: 'relative' },
  heroPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, padding: spacing.md },
  heroEmoji: { fontSize: 42 },
  heroLabel: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  heroSub: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  back: { position: 'absolute', top: 12, left: 12, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  backText: { ...typography.bodyMedium, color: colors.textPrimary },
  stockPill: { position: 'absolute', bottom: 12, left: 12, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border },
  stockPillText: { ...typography.caption, fontFamily: 'Inter_600SemiBold', color: colors.status.cancelled },
  body: { padding: spacing.md, gap: spacing.md },
  name: { ...typography.headingLarge, color: colors.textPrimary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  price: { ...typography.priceLarge, color: colors.forestGreen },
  perUnit: { ...typography.body, color: colors.textMuted, fontFamily: 'Inter_400Regular' },
  bulkSave: { backgroundColor: colors.harvestGoldLight, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  bulkSaveText: { ...typography.caption, fontFamily: 'Inter_600SemiBold', color: colors.harvestGoldDark },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggle: { flex: 1, height: 40, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  toggleOn: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  toggleText: { ...typography.caption, fontFamily: 'Inter_600SemiBold', color: colors.textSecondary, textAlign: 'center' },
  toggleTextOn: { color: colors.white },
  desc: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  farmerCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: spacing.sm, ...shadow.card },
  farmerHead: { flexDirection: 'row', gap: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.forestGreen, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontFamily: 'Inter_700Bold', fontSize: 13 },
  farmerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  farmerName: { ...typography.bodyMedium, color: colors.textPrimary },
  verified: { backgroundColor: colors.forestGreenLight, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  verifiedText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: colors.forestGreen },
  farmerFarm: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  farmerMeta: { ...typography.caption, color: colors.textMuted },
  section: { gap: 8 },
  sectionLabel: { ...typography.label, color: colors.textMuted },
  stockNote: { ...typography.caption, color: colors.textMuted },
  subtotal: { ...typography.heading, color: colors.textPrimary },
  subtotalQty: { ...typography.body, color: colors.textMuted, fontFamily: 'Inter_400Regular' },
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.borderLight,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md
  },
  ctaPriceWrap: { gap: 2 },
  ctaLabel: { ...typography.caption, color: colors.textMuted },
  ctaPrice: { ...typography.priceLarge, color: colors.textPrimary, fontSize: 18 },
  cta: { flex: 1, backgroundColor: colors.forestGreen, borderRadius: radius.pill, height: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ctaText: { ...typography.bodyMedium, color: colors.white },
});
