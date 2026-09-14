import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { requestQuote } from '../api/quotes';
import { peso } from '../utils/format';

// B2B: business buyer requests a bulk quote on a listing (one-round flow).
export default function QuoteRequestScreen({ route, navigation }) {
  const { product } = route.params ?? {};
  const [qty, setQty] = useState(product?.min_bulk_quantity ?? 10);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  if (!product) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={[s.card, { alignItems: 'center' }]}>
          <Text style={s.label}>No product selected</Text>
          <Text style={s.error}>Open a listing first, then request a bulk quote.</Text>
          <Pressable onPress={() => navigation.goBack()} style={s.btnPrimary}>
            <Text style={s.btnPrimaryText}>‹ Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestQuote(product.id, qty, message.trim() || null);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Request bulk quote</Text>
        <Text style={s.headerSub}>{product.name} • {peso(product.price_per_unit)}/{product.unit_type} retail</Text>
      </View>

      {done ? (
        <View style={s.card}>
          <Text style={s.doneText}>✓ Request sent! The farmer will get back to you with a price — track it under Orders → Bulk quotes.</Text>
          <Pressable onPress={() => navigation.goBack()} style={s.btnPrimary}>
            <Text style={s.btnPrimaryText}>Done</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.label}>How many {product.unit_type}?</Text>
          <View style={s.stepperRow}>
            <Pressable onPress={() => setQty((v) => Math.max(product.min_bulk_quantity ?? 1, v - 1))} style={s.stepBtn}><Text style={s.stepBtnText}>−</Text></Pressable>
            <Text style={s.qty}>{qty}</Text>
            <Pressable onPress={() => setQty((v) => v + 1)} style={s.stepBtn}><Text style={s.stepBtnText}>+</Text></Pressable>
          </View>
          {(product.min_bulk_quantity ? qty < product.min_bulk_quantity : false) && (
            <Text style={s.error}>Bulk quotes start at {product.min_bulk_quantity} {product.unit_type}.</Text>
          )}
          <TextInput
            style={s.input}
            placeholder="Message to the farmer (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
            value={message}
            onChangeText={setMessage}
          />
          {error && <Text style={s.error}>{error}</Text>}
          <Pressable onPress={submit} disabled={busy} style={s.btnPrimary}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={s.btnPrimaryText}>Send request</Text>}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutralBg },
  header: { backgroundColor: colors.forestGreen, padding: spacing.md, gap: 2 },
  headerTitle: { ...typography.heading, color: colors.white },
  headerSub: { ...typography.caption, color: 'rgba(255,255,255,0.8)' },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: 12, margin: spacing.md },
  label: { ...typography.bodyMedium, color: colors.textPrimary },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.forestGreenLight, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 22, color: colors.forestGreen, fontFamily: 'Poppins_600SemiBold' },
  qty: { ...typography.headingLarge, color: colors.textPrimary, minWidth: 60, textAlign: 'center' },
  input: { minHeight: 70, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.sm, textAlignVertical: 'top', ...typography.body, color: colors.textPrimary },
  error: { ...typography.caption, color: colors.status.cancelled },
  doneText: { ...typography.body, color: colors.status.confirmed, lineHeight: 22 },
  btnPrimary: { height: 44, borderRadius: radius.pill, backgroundColor: colors.forestGreen, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { ...typography.bodyMedium, color: colors.white },
});
