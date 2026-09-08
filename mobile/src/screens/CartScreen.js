import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing, shadow } from '../theme/spacing';
import { typography } from '../theme/typography';
import { peso } from '../utils/format';
import { useCart } from '../context/CartContext';
import QuantityStepper from '../components/QuantityStepper';

export default function CartScreen({ navigation }) {
  const { items, updateQty, remove, subtotal, deliveryFee, total, fulfillment, setFulfillment, orderType, setOrderType } = useCart();

  if (items.length === 0) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}><Pressable onPress={() => navigation.goBack()} style={s.back}><Text style={s.backText}>‹ Back</Text></Pressable><Text style={s.headerTitle}>Your basket</Text><View style={{ width: 60 }} /></View>
        <View style={s.empty}><Text style={s.emptyEmoji}>🧺</Text><Text style={s.emptyTitle}>Your basket is empty</Text><Text style={s.emptySub}>Add gulay or bigas from nearby farms — we keep it to one tap.</Text><Pressable onPress={() => navigation.navigate('Feed')} style={s.emptyCta}><Text style={s.emptyCtaText}>Browse harvests</Text></Pressable></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.back}><Text style={s.backText}>‹ Back</Text></Pressable>
        <Text style={s.headerTitle}>Basket • {items.length} farms</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.product.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 200 }}
        renderItem={({ item: { product, qty } }) => (
          <View style={s.item}>
            <View style={s.itemTop}>
              <View style={s.thumb}><Text style={s.thumbEmoji}>{product.category === 'Bigas' ? '🌾' : '🥬'}</Text></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.itemName} numberOfLines={1}>{product.name}</Text>
                <Text style={s.itemFarm} numberOfLines={1}>{product.farmer.farm_name} {product.farmer.verified ? '✓' : ''} • {product.farmer.barangay}</Text>
                <Text style={s.itemPrice}>{peso(product.price_per_unit)} / {product.unit_type}</Text>
              </View>
              <Pressable onPress={() => remove(product.id)} hitSlop={12} style={s.remove}><Text style={s.removeText}>✕</Text></Pressable>
            </View>
            <QuantityStepper value={qty} onDec={() => updateQty(product.id, qty - 1)} onInc={() => updateQty(product.id, qty + 1)} max={product.available_quantity} unit={product.unit_type} compact />
          </View>
        )}
        ListHeaderComponent={
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            <View style={s.toggleGroup}>
              <Pressable onPress={() => setOrderType('retail')} style={[s.pill, orderType === 'retail' && s.pillOn]}><Text style={[s.pillText, orderType === 'retail' && s.pillTextOn]}>Retail</Text></Pressable>
              <Pressable onPress={() => setOrderType('bulk')} style={[s.pill, orderType === 'bulk' && s.pillOn]}><Text style={[s.pillText, orderType === 'bulk' && s.pillTextOn]}>Bulk (B2B)</Text></Pressable>
              <Text style={s.hint}>Bulk applies where {`≥ min`} is met</Text>
            </View>
            <View style={s.toggleGroup}>
              <Pressable onPress={() => setFulfillment('delivery')} style={[s.pill, fulfillment === 'delivery' && s.pillOn]}><Text style={[s.pillText, fulfillment === 'delivery' && s.pillTextOn]}>Delivery • ₱45</Text></Pressable>
              <Pressable onPress={() => setFulfillment('pickup')} style={[s.pill, fulfillment === 'pickup' && s.pillOn]}><Text style={[s.pillText, fulfillment === 'pickup' && s.pillTextOn]}>Pickup • Free</Text></Pressable>
            </View>
          </View>
        }
      />

      <View style={s.summary}>
        <View style={s.row}><Text style={s.rowLabel}>Subtotal</Text><Text style={s.rowValue}>{peso(subtotal)}</Text></View>
        <View style={s.row}><Text style={s.rowLabel}>{fulfillment === 'delivery' ? 'Delivery' : 'Pickup'}</Text><Text style={s.rowValue}>{fulfillment === 'delivery' ? peso(deliveryFee) : 'Free'}</Text></View>
        <View style={[s.row, s.rowTotal]}><Text style={s.totalLabel}>Total</Text><Text style={s.totalValue}>{peso(total)}</Text></View>
        <Pressable onPress={() => navigation.navigate('Checkout')} style={s.checkout}><Text style={s.checkoutText}>Checkout • {peso(total)}</Text></Pressable>
        <Text style={s.trust}>✓ 2FA secured • Direct to farmer • Pay on delivery or pickup</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutralBg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  headerTitle: { ...typography.heading, color: colors.textPrimary },
  back: { backgroundColor: colors.neutralBg, borderRadius: radius.pill, paddingHorizontal: 12, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  backText: { ...typography.bodyMedium, color: colors.textPrimary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { ...typography.heading, color: colors.textPrimary, textAlign: 'center' },
  emptySub: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  emptyCta: { marginTop: 12, backgroundColor: colors.forestGreen, borderRadius: radius.pill, height: 44, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  emptyCtaText: { ...typography.bodyMedium, color: colors.white },
  item: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: spacing.sm, ...shadow.card },
  itemTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  thumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.forestGreenLight, alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 20 },
  itemName: { ...typography.bodyMedium, color: colors.textPrimary },
  itemFarm: { ...typography.caption, color: colors.textMuted },
  itemPrice: { ...typography.caption, color: colors.forestGreen, fontFamily: 'Poppins_600SemiBold' },
  remove: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.neutralBg, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.textMuted },
  toggleGroup: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  pill: { paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  pillText: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.textSecondary },
  pillTextOn: { color: colors.white },
  hint: { ...typography.caption, color: colors.textMuted, marginLeft: 4 },
  summary: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.borderLight, padding: spacing.md, gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { ...typography.body, color: colors.textSecondary },
  rowValue: { ...typography.bodyMedium, color: colors.textPrimary },
  rowTotal: { paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: 4 },
  totalLabel: { ...typography.heading, color: colors.textPrimary },
  totalValue: { ...typography.heading, color: colors.forestGreen },
  checkout: { backgroundColor: colors.forestGreen, borderRadius: radius.pill, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  checkoutText: { ...typography.bodyMedium, color: colors.white },
  trust: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
});
