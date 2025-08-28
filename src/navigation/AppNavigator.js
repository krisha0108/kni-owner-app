// src/navigation/AppNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import RestaurantLogin from '../screens/RestaurantLogin';
import RestaurantRegister from '../screens/RestaurantRegisterScreen'; 
import RestaurantOnboarding from '../screens/RestaurantOnboardingScreen';
import RequestScreen from '../screens/RequestScreen';
import RequestDetail from '../screens/RequestDetail';
import RequestNow from '../screens/RequestNowScreen';
import RestaurantView from '../screens/RestaurantView';
import RestaurantsScreen from '../screens/RestaurantsScreen';
import SupportCenter from '../screens/SupportCenter';
import SupportTicketDetail from '../screens/SupportTicketDetail';
import Notifications from '../screens/Notifications';
import ProfileScreen from '../screens/ProfileScreen';
import Home from '../screens/HomeScreen'; 
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
       <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="RestaurantLogin" component={RestaurantLogin} />
      <Stack.Screen name="RestaurantRegister" component={RestaurantRegister} />
      <Stack.Screen name="RestaurantOnboarding" component={RestaurantOnboarding} />
      <Stack.Screen name="Request" component={RequestScreen} />
      <Stack.Screen name="RequestDetail" component={RequestDetail} />
      <Stack.Screen name="RequestNow" component={RequestNow} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Restaurants" component={RestaurantsScreen} />
      <Stack.Screen name="SupportCenter" component={SupportCenter} />
      <Stack.Screen name="SupportTicketDetail" component={SupportTicketDetail} />
      <Stack.Screen name="RestaurantView" component={RestaurantView} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="Home" component={Home} />
    </Stack.Navigator>
    </SafeAreaProvider>
  );
}
