import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { CartProvider } from './src/context/CartContext';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/theme/colors';
import { usePushNotifications } from './src/hooks/usePushNotifications';

export default function App() {
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.neutralBg, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.forestGreen, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.white, fontSize: 22, fontWeight: '700' }}>A</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }}>AniLink — Cultivating Connection</Text>
        <ActivityIndicator color={colors.forestGreen} />
        <StatusBar style="dark" />
      </View>
    );
  }

  function PushBootstrap({ children }) {
    usePushNotifications();
    return children;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <NavigationContainer>
            <PushBootstrap>
              <AppNavigator />
            </PushBootstrap>
            <StatusBar style="dark" backgroundColor={colors.neutralBg} />
          </NavigationContainer>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
