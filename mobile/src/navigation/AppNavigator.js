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
import PredictPlaceholder from '../screens/PredictPlaceholder';
import ProfilePlaceholder from '../screens/ProfilePlaceholder';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  const icons = { Home: '⌂', Orders: '≡', Inventory: '▦', Predict: '◈', Profile: '○' };
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <View style={{
        width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
        backgroundColor: focused ? colors.forestGreen : 'transparent'
      }}>
        <Text style={{ color: focused ? colors.white : colors.textMuted, fontSize: 14 }}>{icons[label] ?? '•'}</Text>
      </View>
      <Text style={{ ...typography.caption, fontSize: 10, color: focused ? colors.forestGreen : colors.textMuted, fontFamily: focused ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>{label}</Text>
    </View>
  );
}

function OrdersRoute() {
  const { user } = useAuth();
  if (user?.role === 'farmer') return <FarmerOrdersScreen />;
  return <BuyerOrdersScreen />;
}

function ManageRoute() {
  const { user } = useAuth();
  // DESIGN.md: Farmer view and Buyer view share same shell but swap tab contents based on role
  if (user?.role === 'farmer') return <InventoryScreen />;
  return <PredictPlaceholder />;
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

function Tabs() {
  const { user } = useAuth();
  const isFarmer = user?.role === 'farmer';
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
      {/* DESIGN.md: bottom tab Home / Orders / Inventory-Predict / Profile — swaps on role */}
      <Tab.Screen
        name="ManageTab"
        component={ManageRoute}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label={isFarmer ? 'Inventory' : 'Predict'} focused={focused} />,
          tabBarBadge: undefined,
        }}
      />
      <Tab.Screen name="ProfileTab" component={ProfilePlaceholder} options={{ tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Tabs" component={Tabs} />
      <RootStack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: 'card' }} />
    </RootStack.Navigator>
  );
}
