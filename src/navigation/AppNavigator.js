import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { api } from '../api/client';

// Auth & Onboarding Screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import RestaurantLogin from '../screens/RestaurantLogin';
import RestaurantRegister from '../screens/RestaurantRegisterScreen';
import RestaurantOnboarding from '../screens/RestaurantOnboardingScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';

// Dashboard & Analytics
import DashboardScreen from '../screens/DashboardScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';

// Restaurant Management
import MyRestaurantsScreen from '../screens/MyRestaurantsScreen';
import RestaurantStatusScreen from '../screens/RestaurantStatusScreen';
import MenuManagementScreen from '../screens/MenuManagementScreen';

// Equipment
import MyEquipmentScreen from '../screens/MyEquipmentScreen';
import EquipmentProfileScreen from '../screens/EquipmentProfileScreen';

// Service Bookings
import MyBookingsScreen from '../screens/MyBookingsScreen';
import ServiceRequestScreen from '../screens/ServiceRequestScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';

// Finance
import ExpensesScreen from '../screens/ExpensesScreen';
import ExpenseReportsScreen from '../screens/ExpenseReportsScreen';
import KhatabookScreen from '../screens/KhatabookScreen';
import CashbookScreen from '../screens/CashbookScreen';
import VendorLedgerScreen from '../screens/VendorLedgerScreen';

// Staff Management
import StaffScreen from '../screens/StaffScreen';
import StaffAttendanceScreen from '../screens/StaffAttendanceScreen';
import StaffSalaryScreen from '../screens/StaffSalaryScreen';

// Team Management
import TeamManagementScreen from '../screens/TeamManagementScreen';
import TeamAcceptScreen from '../screens/TeamAcceptScreen';

// Restaurant Create
import RestaurantCreateScreen from '../screens/RestaurantCreateScreen';

// Phase 4: Feature Parity Screens
import NewBookingScreen from '../screens/NewBookingScreen';
import FeedScreen from '../screens/FeedScreen';
import CategoryDetailScreen from '../screens/CategoryDetailScreen';
import PaymentTrackingScreen from '../screens/PaymentTrackingScreen';

// Marketplace
import MarketplaceScreen from '../screens/MarketplaceScreen';
import MarketplaceProductScreen from '../screens/MarketplaceProductScreen';
import MarketplaceOrdersScreen from '../screens/MarketplaceOrdersScreen';
import MarketplaceCartScreen from '../screens/MarketplaceCartScreen';

// Profile & Support
import ProfileScreen from '../screens/ProfileScreen';
import EditOwnerProfile from '../screens/EditOwnerProfile';
import SupportCenter from '../screens/SupportCenter';
import SupportTicketDetail from '../screens/SupportTicketDetail';
import Notifications from '../screens/Notifications';
import NotificationDetail from '../screens/NotificationDetail';

// Phase 3: Advanced Features
import PaymentUploadScreen from '../screens/PaymentUploadScreen';
import CategoryRequestScreen from '../screens/CategoryRequestScreen';
import CartScreen from '../screens/CartScreen';
import CreateMarketplaceOrderScreen from '../screens/CreateMarketplaceOrderScreen';

// Legacy Screens (keeping for compatibility)
import RequestScreen from '../screens/RequestScreen';
import RequestDetail from '../screens/RequestDetail';
import RequestNow from '../screens/RequestNowScreen';
import RestaurantView from '../screens/RestaurantView';
import RestaurantsScreen from '../screens/RestaurantsScreen';
import ServiceHistoryScreen from '../screens/ServiceHistoryScreen';
import SlotBookingScreen from '../screens/SlotBookingScreen';
import Home from '../screens/HomeScreen';
import OrdersListScreen from '../screens/OrdersListScreen';
import SpendingReportsScreen from '../screens/SpendingReportsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isChecking, setIsChecking] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Splash');

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userData = await AsyncStorage.getItem('user');

        // Wait 2.5 seconds to allow splash animation
        await new Promise(resolve => setTimeout(resolve, 2500));

        if (token && userData) {
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
          setInitialRoute('Home');
        } else {
          setInitialRoute('Onboarding');
        }
      } catch (error) {
        console.log('Auth check error:', error);
        setInitialRoute('Onboarding');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthState();
  }, []);

  if (isChecking) return <SplashScreen />;

  return (
    <SafeAreaProvider>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        {/* Auth & Onboarding Screens */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="RestaurantLogin" component={RestaurantLogin} />
        <Stack.Screen name="RestaurantRegister" component={RestaurantRegister} />
        <Stack.Screen name="RestaurantOnboarding" component={RestaurantOnboarding} />
        <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        <Stack.Screen name="TeamAccept" component={TeamAcceptScreen} />

        {/* Main App Screens */}
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
        <Stack.Screen name="MyRestaurants" component={MyRestaurantsScreen} />
        <Stack.Screen name="RestaurantCreate" component={RestaurantCreateScreen} />
        <Stack.Screen name="RestaurantStatus" component={RestaurantStatusScreen} />
        <Stack.Screen name="MenuManagement" component={MenuManagementScreen} />
        <Stack.Screen name="TeamManagement" component={TeamManagementScreen} />
        <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
        <Stack.Screen name="Expenses" component={ExpensesScreen} />
        <Stack.Screen name="ExpenseReports" component={ExpenseReportsScreen} />
        <Stack.Screen name="Khatabook" component={KhatabookScreen} />
        <Stack.Screen name="Cashbook" component={CashbookScreen} />
        <Stack.Screen name="VendorLedger" component={VendorLedgerScreen} />
        <Stack.Screen name="SpendingReports" component={SpendingReportsScreen} />
        <Stack.Screen name="Staff" component={StaffScreen} />
        <Stack.Screen name="StaffAttendance" component={StaffAttendanceScreen} />
        <Stack.Screen name="StaffSalary" component={StaffSalaryScreen} />
        <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
        <Stack.Screen name="MarketplaceProduct" component={MarketplaceProductScreen} />
        <Stack.Screen name="MarketplaceOrders" component={MarketplaceOrdersScreen} />
        <Stack.Screen name="MarketplaceCart" component={MarketplaceCartScreen} />

        {/* Equipment & Service Screens */}
        <Stack.Screen name="MyEquipment" component={MyEquipmentScreen} />
        <Stack.Screen name="EquipmentProfile" component={EquipmentProfileScreen} />
        <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
        <Stack.Screen name="SupportCenter" component={SupportCenter} />

        {/* Profile Screens */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EditOwnerProfile" component={EditOwnerProfile} />
        <Stack.Screen name="SupportTicketDetail" component={SupportTicketDetail} />
        <Stack.Screen name="Notifications" component={Notifications} />
        <Stack.Screen name="NotificationDetail" component={NotificationDetail} />

        {/* Phase 3: Advanced Feature Screens */}
        <Stack.Screen name="PaymentUpload" component={PaymentUploadScreen} />
        <Stack.Screen name="CategoryRequest" component={CategoryRequestScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="CreateMarketplaceOrder" component={CreateMarketplaceOrderScreen} />

        {/* Phase 4: Feature Parity Screens */}
        <Stack.Screen name="NewBooking" component={NewBookingScreen} />
        <Stack.Screen name="Feed" component={FeedScreen} />
        <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
        <Stack.Screen name="PaymentTracking" component={PaymentTrackingScreen} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />

        {/* Legacy screens kept for compatibility */}
        <Stack.Screen name="Request" component={RequestScreen} />
        <Stack.Screen name="RequestDetail" component={RequestDetail} />
        <Stack.Screen name="RequestNow" component={RequestNow} />
        <Stack.Screen name="Restaurants" component={RestaurantsScreen} />
        <Stack.Screen name="RestaurantView" component={RestaurantView} />
        <Stack.Screen name="ServiceHistory" component={ServiceHistoryScreen} />
        <Stack.Screen name="SlotBooking" component={SlotBookingScreen} />
        <Stack.Screen name="OrdersList" component={OrdersListScreen} />
      </Stack.Navigator>
    </SafeAreaProvider>
  );
}
