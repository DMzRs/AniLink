import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';
import { api } from '../api/client';

// Two-step password reset: request a 6-digit code, then set a new password.
// On success the API signs out every device, so the user logs in fresh.
export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [step, setStep] = React.useState('email'); // email | reset | done
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [passwordConfirmation, setPasswordConfirmation] = React.useState('');
  const [error, setError] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const requestCode = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const res = await api.request('/password/forgot', { method: 'POST', body: { email } });
      if (res.code_hint) setCode(res.code_hint); // local dev convenience, mirrors login auto-verify
      setStep('reset');
      setNotice(res.message);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const resetPassword = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const res = await api.request('/password/reset', {
        method: 'POST',
        body: { email, code, password, password_confirmation: passwordConfirmation },
      });
      setStep('done');
      setNotice(res.message);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Reset password</Text>
      <Text style={s.subtitle}>
        {step === 'email' && 'Enter your account email and we will send you a 6-digit reset code.'}
        {step === 'reset' && `Enter the code sent to ${email || 'your email'} and choose a new password.`}
        {step === 'done' && 'All done — every signed-in device was signed out for safety.'}
      </Text>

      {step === 'email' && (
        <View style={s.card}>
          <TextInput
            style={s.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          {error && <Text style={s.error}>{error}</Text>}
          <Pressable onPress={requestCode} disabled={busy} style={s.btnPrimary}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={s.btnPrimaryText}>Send reset code</Text>}
          </Pressable>
        </View>
      )}

      {step === 'reset' && (
        <View style={s.card}>
          {notice && <Text style={s.notice}>{notice}</Text>}
          <TextInput
            style={s.inputCode}
            placeholder="123456"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
          />
          <TextInput
            style={s.input}
            placeholder="New password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={s.input}
            placeholder="Confirm new password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={passwordConfirmation}
            onChangeText={setPasswordConfirmation}
          />
          {error && <Text style={s.error}>{error}</Text>}
          <Pressable onPress={resetPassword} disabled={busy} style={s.btnPrimary}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={s.btnPrimaryText}>Set new password</Text>}
          </Pressable>
        </View>
      )}

      {step === 'done' && (
        <View style={s.card}>
          {notice && <Text style={s.notice}>{notice}</Text>}
          <Pressable onPress={() => navigation.goBack()} style={s.btnPrimary}>
            <Text style={s.btnPrimaryText}>Back to sign in</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutralBg, padding: spacing.md, gap: spacing.md, justifyContent: 'center' },
  title: { ...typography.headingLarge, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: 10 },
  input: {
    height: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: spacing.md, ...typography.bodyMedium, color: colors.textPrimary,
  },
  inputCode: {
    height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: spacing.md, textAlign: 'center', fontSize: 20, letterSpacing: 6, color: colors.textPrimary,
  },
  error: { ...typography.caption, color: colors.status.cancelled, lineHeight: 16 },
  notice: { ...typography.caption, color: colors.status.confirmed, lineHeight: 16 },
  btnPrimary: { height: 44, borderRadius: radius.pill, backgroundColor: colors.forestGreen, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryText: { ...typography.bodyMedium, color: colors.white },
});
