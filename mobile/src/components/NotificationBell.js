import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getUnreadCount } from '../api/notifications';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

export default function NotificationBell({ onPress }) {
  const { token } = useAuth();
  const [count, setCount] = useState(0);

  const fetch = useCallback(async () => {
    if (!token) return;
    try {
      const c = await getUnreadCount();
      setCount(c);
    } catch {}
  }, [token]);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, 15000); // poll per spec rural queuing fallback
    return () => clearInterval(id);
  }, [fetch]);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  return (
    <Pressable onPress={onPress} style={s.bell} hitSlop={8}>
      <Text style={s.icon}>🔔</Text>
      {count > 0 && (
        <View style={s.badge}>
          <Text style={s.badgeText}>{count > 9 ? '9+' : String(count)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  bell: {
    width: 44, height: 44, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 16, color: colors.white },
  badge: {
    position: 'absolute', top: -4, right: -4, backgroundColor: colors.harvestGold, borderRadius: 999,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 1, borderColor: colors.white,
  },
  badgeText: { ...typography.caption, fontFamily: 'Inter_700Bold', color: colors.textPrimary, fontSize: 10, lineHeight: 12 },
});
