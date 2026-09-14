import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

import FeedScreen from '../screens/FeedScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import FarmerOrdersScreen from '../screens/FarmerOrdersScreen';
import BuyerOrdersScreen from '../screens/BuyerOrdersScreen';
import InventoryScreen from '../screens/InventoryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfilePlaceholder from '../screens/ProfilePlaceholder';
import PredictScreen from '../screens/PredictScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ReviewScreen from '../screens/ReviewScreen';
import QuoteRequestScreen from '../screens/QuoteRequestScreen';
import BuyerQuotesScreen from '../screens/BuyerQuotesScreen';
import FarmerQuotesScreen from '../screens/FarmerQuotesScreen';
import ReportScreen from '../screens/ReportScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminVerificationsScreen from '../screens/admin/AdminVerificationsScreen';
import AdminListingsScreen from '../screens/admin/AdminListingsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  const icons = { Home: '⌂', Orders: '≡', Inventory: '▦', Predict: '◈', Profile: '○', Admin: '★' };
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <View style={{
        width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
        backgroundColor: focused ? colors.forestGreen : 'transparent'
      }}>
        <Text style={{ color: focused ? colors.white : colors.textMuted, fontSize: 14 }}>{icons[label] ?? '•'}</Text>
      </View>
      <Text style={{ ...typography.caption, fontSize: 10, color: focused ? colors.forestGreen : colors.textMuted, fontFamily: focused ? 'Poppins_600SemiBold' : 'Poppins_400Regular' }}>{label}</Text>
    </View>
  );
}

function OrdersRoute() {
  const { user } = useAuth();
  if (user?.role === 'farmer') return <FarmerOrdersScreen />;
  return <BuyerOrdersScreen />;
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Feed" component={FeedScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
    </Stack.Navigator>
  );
}

// Admin-only section — same app, extra tab per role (moderation, verification, analytics)
function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="AdminVerifications" component={AdminVerificationsScreen} />
      <Stack.Screen name="AdminListings" component={AdminListingsScreen} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
    </Stack.Navigator>
  );
}

function Tabs() {
  const { user } = useAuth();
  const isFarmer = user?.role === 'farmer';
  const isAdmin = user?.role === 'admin';
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.borderLight, borderTopWidth: 1, height: 64, paddingTop: 6, paddingBottom: 8 },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} options={{ tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} /> }} />
      <Tab.Screen name="OrdersTab" component={OrdersRoute} options={{ tabBarIcon: ({ focused }) => <TabIcon label="Orders" focused={focused} /> }} />
      {/* DESIGN.md: bottom tab Home / Orders / Inventory-Predict / Profile — swaps on role.
          AniPredict is a farmer tool per spec: it opens from a card inside the farmer's
          Inventory tab; buyers get Home / Orders / Profile. */}
      {isFarmer && (
        <Tab.Screen
          name="ManageTab"
          component={InventoryScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="Inventory" focused={focused} /> }}
        />
      )}
      {isAdmin && (
        <Tab.Screen name="AdminTab" component={AdminStack} options={{ tabBarIcon: ({ focused }) => <TabIcon label="Admin" focused={focused} /> }} />
      )}
      <Tab.Screen name="ProfileTab" component={ProfilePlaceholder} options={{ tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={Tabs} />
      <RootStack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'card' }} />
      <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ presentation: 'card' }} />
      <RootStack.Screen name="Review" component={ReviewScreen} options={{ presentation: 'card' }} />
      <RootStack.Screen name="Predict" component={PredictScreen} options={{ presentation: 'card' }} />
      <RootStack.Screen name="QuoteRequest" component={QuoteRequestScreen} options={{ presentation: 'card' }} />
      <RootStack.Screen name="BuyerQuotes" component={BuyerQuotesScreen} options={{ presentation: 'card' }} />
      <RootStack.Screen name="FarmerQuotes" component={FarmerQuotesScreen} options={{ presentation: 'card' }} />
      <RootStack.Screen name="Report" component={ReportScreen} options={{ presentation: 'card' }} />
    </RootStack.Navigator>
  );
}
