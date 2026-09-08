import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { useAuth } from '../context/AuthContext';

export default function ProfilePlaceholder() {
  const { user, login, logout } = useAuth();
  const [busy, setBusy] = React.useState(null);

  const handleLogin = async (role) => {
    setBusy(role);
    const creds =
      role === 'farmer' ? ['lito@anilink.test', 'password123'] :
      role === 'buyer' ? ['buyer@anilink.test', 'password123'] :
      role === 'biz' ? ['biz@anilink.test', 'password123'] : null;
    if (!creds) { setBusy(null); return; }
    try { await login(creds[0], creds[1]); } catch (e) { /* handled */ }
    setBusy(null);
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Profile</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>{user ? `${user.name} • ${user.role}` : 'Not signed in (browsing as guest)'}</Text>
        <Text style={s.cardText}>
          {user?.role === 'farmer' ? `Farm: ${user.farmerProfile?.farm_name ?? '—'} • ${user.farmerProfile?.barangay ?? ''} • Verified: ${user.farmerProfile?.verification_status ?? 'pending'}` :
           user ? `Phone: ${user.phone ?? '—'} • ${user.email}` :
           'Guest browsing — AniMarkets uses /api/products public. Sign in to test role-based tabs per DESIGN.md'}
        </Text>
        <Text style={s.cardText}>Bottom tab Home / Orders / {user?.role === 'farmer' ? 'Inventory' : 'Predict'} / Profile swaps on role • Verified badge + 2FA shown on inventory/order chips</Text>
      </View>

      <View style={s.actions}>
        <Text style={s.actionsLabel}>Demo switch role (one-tap, 44pt)</Text>
        <Pressable onPress={() => handleLogin('farmer')} style={s.btnFarmer}>{busy === 'farmer' ? <ActivityIndicator color={colors.white} /> : <Text style={s.btnText}>Sign in as Farmer • lito</Text>}</Pressable>
        <Pressable onPress={() => handleLogin('buyer')} style={s.btnOutline}>{busy === 'buyer' ? <ActivityIndicator color={colors.forestGreen} /> : <Text style={s.btnOutlineText}>Sign in as Buyer • Maria</Text>}</Pressable>
        <Pressable onPress={() => handleLogin('biz')} style={s.btnGold}>{busy === 'biz' ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={s.btnGoldText}>Sign in as Business • Tess</Text>}</Pressable>
        {user && <Pressable onPress={logout} style={s.btnGhost}><Text style={s.btnGhostText}>Sign out</Text></Pressable>}
      </View>

      <View style={s.trustBox}>
        <Text style={s.trustText}>✓ Verified farm • ✓ 2FA secured • ✓ Fair trades — colors from DESIGN.md: Forest Green #2E5339 / Harvest Gold #D4A017</Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutralBg, padding: spacing.md, gap: spacing.md, justifyContent: 'center' },
  title: { ...typography.headingLarge, color: colors.textPrimary, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: 8 },
  cardTitle: { ...typography.headingSmall, color: colors.textPrimary },
  cardText: { ...typography.body, color: colors.textMuted, lineHeight: 20 },
  actions: { gap: 10 },
  actionsLabel: { ...typography.label, color: colors.textMuted, fontSize: 10 },
  btnFarmer: { height: 44, borderRadius: radius.pill, backgroundColor: colors.forestGreen, alignItems: 'center', justifyContent: 'center' },
  btnText: { ...typography.bodyMedium, color: colors.white },
  btnOutline: { height: 44, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.forestGreen, alignItems: 'center', justifyContent: 'center' },
  btnOutlineText: { ...typography.bodyMedium, color: colors.forestGreen },
  btnGold: { height: 44, borderRadius: radius.pill, backgroundColor: colors.harvestGold, alignItems: 'center', justifyContent: 'center' },
  btnGoldText: { ...typography.bodyMedium, color: colors.textPrimary },
  btnGhost: { height: 44, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  btnGhostText: { ...typography.bodyMedium, color: colors.textSecondary },
  trustBox: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: 10 },
  trustText: { ...typography.caption, color: colors.textMuted, textAlign: 'center', lineHeight: 16 },
});
