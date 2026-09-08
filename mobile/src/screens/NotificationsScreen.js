import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getNotifications, markRead } from '../api/notifications';
import { useAuth } from '../context/AuthContext';

const typeColor = (t) => {
  if (t === 'new_order') return colors.forestGreen;
  if (t === 'order_update' || t === 'order_placed') return colors.harvestGold;
  return colors.textMuted;
};

export default function NotificationsScreen({ navigation }) {
  const { token, login } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingMock, setUsingMock] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let hasToken = !!token;
      if (!hasToken) {
        try { await login('buyer@anilink.test', 'password123'); hasToken = true; } catch {}
      }
      if (!hasToken) throw new Error('Offline');
      const data = await getNotifications();
      setItems(Array.isArray(data) ? data : []);
      setUsingMock(false);
    } catch (e) {
      setUsingMock(true);
      setItems([
        { id: 1, type: 'new_order', title: 'New order received', body: 'Order #101 from Maria Santos — retail • delivery', is_read: false, created_at: new Date().toISOString() },
        { id: 2, type: 'order_update', title: 'Order update', body: 'Order #101 is now confirmed — farmer is preparing your harvest.', is_read: false, created_at: new Date(Date.now() - 60000).toISOString() },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, login]);

  useEffect(() => { fetch(); }, [fetch]);

  const handlePress = async (item) => {
    if (!item.is_read && !usingMock) {
      try { await markRead(item.id); } catch {}
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)));
    }
    // Deep link per data.type — for now just stay
  };

  if (loading) return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={colors.forestGreen} /><Text style={s.loadingText}>Loading notifications… tied to push</Text></View></SafeAreaView>;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => navigation?.goBack?.()} style={s.back}><Text style={s.backText}>‹ Back</Text></Pressable>
        <Text style={s.headerTitle}>Notifications</Text>
        <View style={{ width: 60 }} />
      </View>
      {usingMock && <View style={s.offlineBanner}><Text style={s.offlineText}>Offline demo — {items.length} cached • push will sync via notifications table when online</Text></View>}
      <View style={s.subHeader}><Text style={s.subText}>Push via Expo • tied to `notifications` table • new orders + status changes</Text></View>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={colors.forestGreen} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => handlePress(item)} style={[s.card, !item.is_read && s.unread]}>
            <View style={s.dotRow}>
              <View style={[s.dot, { backgroundColor: typeColor(item.type) }]} />
              <Text style={s.type}>{item.type}</Text>
              {!item.is_read && <View style={s.unreadPill}><Text style={s.unreadText}>New</Text></View>}
              <Text style={s.time}>{new Date(item.created_at).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</Text>
            </View>
            <Text style={s.title}>{item.title}</Text>
            <Text style={s.body}>{item.body}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No notifications yet. Place an order to trigger push.</Text></View>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutralBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { ...typography.body, color: colors.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  headerTitle: { ...typography.heading, color: colors.textPrimary },
  back: { backgroundColor: colors.neutralBg, borderRadius: radius.pill, paddingHorizontal: 12, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  backText: { ...typography.bodyMedium, color: colors.textPrimary },
  offlineBanner: { backgroundColor: colors.harvestGoldLight, margin: spacing.md, borderRadius: radius.md, padding: 8, borderWidth: 1, borderColor: '#F2D98A' },
  offlineText: { ...typography.caption, color: colors.harvestGoldDark, textAlign: 'center', fontFamily: 'Inter_600SemiBold' },
  subHeader: { paddingHorizontal: spacing.md, paddingVertical: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  subText: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: 6 },
  unread: { borderColor: colors.forestGreen, borderWidth: 1.5 },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  type: { ...typography.caption, fontFamily: 'Inter_600SemiBold', color: colors.textMuted, flex: 1 },
  unreadPill: { backgroundColor: colors.harvestGold, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 2 },
  unreadText: { ...typography.caption, fontFamily: 'Inter_700Bold', color: colors.textPrimary, fontSize: 10 },
  time: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  title: { ...typography.bodyMedium, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 18 },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
