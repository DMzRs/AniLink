import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { fileReport } from '../api/reports';

const CATEGORIES = [
  { id: 'order_issue', label: 'Order issue' },
  { id: 'product_issue', label: 'Product not as listed' },
  { id: 'payment', label: 'Payment problem' },
  { id: 'user_misconduct', label: 'Conduct' },
  { id: 'other', label: 'Something else' },
];

// Report an order dispute or user misconduct — goes to the admin queue.
export default function ReportScreen({ route, navigation }) {
  const { orderId, reportedUserId, subjectLabel } = route.params ?? {};
  const [category, setCategory] = useState('order_issue');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await fileReport({
        order_id: orderId ?? undefined,
        reported_user_id: reportedUserId ?? undefined,
        category: orderId ? category : category === 'order_issue' ? 'other' : category,
        description: description.trim(),
      });
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
        <Text style={s.headerTitle}>Report a problem</Text>
        <Text style={s.headerSub}>{subjectLabel ?? (orderId ? `Order #${orderId}` : '')}</Text>
      </View>

      {done ? (
        <View style={s.card}>
          <Text style={s.doneText}>✓ Salamat for flagging this. Our team will review it and you'll get an update on the outcome.</Text>
          <Pressable onPress={() => navigation.goBack()} style={s.btnPrimary}>
            <Text style={s.btnPrimaryText}>Done</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <View style={s.card}>
            <Text style={s.label}>What's the problem?</Text>
            <View style={s.catWrap}>
              {CATEGORIES.map((c) => (
                <Pressable key={c.id} onPress={() => setCategory(c.id)} style={[s.catChip, category === c.id && s.catChipOn]}>
                  <Text style={[s.catText, category === c.id && s.catTextOn]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={s.input}
              placeholder="Tell us what happened (min 10 characters)"
              placeholderTextColor={colors.textMuted}
              multiline
              value={description}
              onChangeText={setDescription}
            />
            {error && <Text style={s.error}>{error}</Text>}
            <Pressable onPress={submit} disabled={busy || description.trim().length < 10} style={[s.btnPrimary, description.trim().length < 10 && { opacity: 0.5 }]}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={s.btnPrimaryText}>Send report</Text>}
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutralBg },
  header: { backgroundColor: colors.forestGreen, padding: spacing.md, gap: 2 },
  headerTitle: { ...typography.heading, color: colors.white },
  headerSub: { ...typography.caption, color: 'rgba(255,255,255,0.8)' },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: 12 },
  label: { ...typography.bodyMedium, color: colors.textPrimary },
  catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 12, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  catChipOn: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  catText: { ...typography.caption, color: colors.textSecondary },
  catTextOn: { color: colors.white, fontFamily: 'Poppins_600SemiBold' },
  input: { minHeight: 90, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.sm, textAlignVertical: 'top', ...typography.body, color: colors.textPrimary },
  error: { ...typography.caption, color: colors.status.cancelled },
  doneText: { ...typography.body, color: colors.status.confirmed, lineHeight: 22 },
  btnPrimary: { height: 44, borderRadius: radius.pill, backgroundColor: colors.forestGreen, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { ...typography.bodyMedium, color: colors.white },
});
