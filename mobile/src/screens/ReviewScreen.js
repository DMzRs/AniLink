import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { submitReview } from '../api/reviews';

// Rate a completed order — 1 review per order, enforced by the API.
export default function ReviewScreen({ route, navigation }) {
  const { orderId, farmerName } = route.params ?? {};
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  if (orderId == null) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={[s.card, { alignItems: 'center' }]}>
          <Text style={s.label}>No order selected</Text>
          <Text style={s.error}>Open a completed order first, then leave a review.</Text>
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
      await submitReview(orderId, { rating, comment: comment.trim() || null });
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
        <Text style={s.headerTitle}>Rate your order</Text>
        <Text style={s.headerSub}>Order #{orderId} • {farmerName}</Text>
      </View>

      {done ? (
        <View style={s.card}>
          <Text style={s.doneText}>✓ Salamat for the feedback! Your review is now on the farmer's profile.</Text>
          <Pressable onPress={() => navigation.goBack()} style={s.btnPrimary}>
            <Text style={s.btnPrimaryText}>Back to orders</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.card}>
          <Text style={s.label}>How was the produce and the farmer?</Text>
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} style={s.starHit} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
                <Text style={[s.star, n <= rating && s.starOn]}>★</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.ratingWord}>{['Poor', 'Fair', 'Good', 'Very good', 'Excellent'][rating - 1]}</Text>
          <TextInput
            style={s.input}
            placeholder="Share more details (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
            value={comment}
            onChangeText={setComment}
          />
          {error && <Text style={s.error}>{error}</Text>}
          <Pressable onPress={submit} disabled={busy} style={s.btnPrimary}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={s.btnPrimaryText}>Submit review</Text>}
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
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  starHit: { padding: 4 },
  star: { fontSize: 34, color: colors.border },
  starOn: { color: colors.harvestGold },
  ratingWord: { ...typography.caption, color: colors.textMuted, textAlign: 'center', fontFamily: 'Poppins_600SemiBold' },
  input: {
    minHeight: 80, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight,
    padding: spacing.sm, textAlignVertical: 'top', ...typography.body, color: colors.textPrimary,
  },
  error: { ...typography.caption, color: colors.status.cancelled },
  doneText: { ...typography.body, color: colors.status.confirmed, lineHeight: 22 },
  btnPrimary: { height: 44, borderRadius: radius.pill, backgroundColor: colors.forestGreen, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { ...typography.bodyMedium, color: colors.white },
});
