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
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import RestaurantOnboarding from '../screens/RestaurantOnboardingScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';
import OwnerApprovalPendingScreen from '../screens/OwnerApprovalPendingScreen';

// Analytics
import AnalyticsScreen from '../screens/AnalyticsScreen';

// Restaurant Management
import MyRestaurantsScreen from '../screens/MyRestaurantsScreen';
import RestaurantEditScreen from '../screens/RestaurantEditScreen';
import RestaurantStatusScreen from '../screens/RestaurantStatusScreen';

// Equipment
import EquipmentProfileScreen from '../screens/EquipmentProfileScreen';

// Service Bookings
import MyBookingsScreen from '../screens/MyBookingsScreen';
import ServiceRequestScreen from '../screens/ServiceRequestScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import OffersScreen from '../screens/OffersScreen';

// Finance
import ExpensesScreen from '../screens/ExpensesScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import ExpenseReportsScreen from '../screens/ExpenseReportsScreen';
import CashbookScreen from '../screens/CashbookScreen';
import VendorLedgerScreen from '../screens/VendorLedgerScreen';

// Staff Management
import StaffScreen from '../screens/StaffScreen';
import StaffAttendanceScreen from '../screens/StaffAttendanceScreen';
import StaffSalaryScreen from '../screens/StaffSalaryScreen';

// Team Management
import TeamManagementScreen from '../screens/TeamManagementScreen';
import TeamAcceptScreen from '../screens/TeamAcceptScreen';

// Marketplace
import MarketplaceScreen from '../screens/MarketplaceScreen';
import MarketplaceProductScreen from '../screens/MarketplaceProductScreen';
import MarketplaceOrdersScreen from '../screens/MarketplaceOrdersScreen';
import MarketplaceCartScreen from '../screens/MarketplaceCartScreen';
import MarketplacePaymentScreen from '../screens/MarketplacePaymentScreen';

// Profile & Support
import EditOwnerProfile from '../screens/EditOwnerProfile';
import SupportCenter from '../screens/SupportCenter';
import SupportTicketDetailScreen from '../screens/SupportTicketDetailScreen';
import CreateSupportTicketScreen from '../screens/CreateSupportTicketScreen';
import Notifications from '../screens/Notifications';
import NotificationDetail from '../screens/NotificationDetail';

// Phase 3: Advanced Features
import CategoryRequestScreen from '../screens/CategoryRequestScreen';
import CartScreen from '../screens/CartScreen';
import SlotBookingScreen from '../screens/SlotBookingScreen';

// Search
import SearchScreen from '../screens/SearchScreen';

// AMC (Annual Maintenance Contract)
import AMCDashboardScreen from '../screens/AMCDashboardScreen';
import AMCRequestScreen from '../screens/AMCRequestScreen';
import AMCRequestsListScreen from '../screens/AMCRequestsListScreen';
import AMCRequestDetailScreen from '../screens/AMCRequestDetailScreen';
import AMCContractsScreen from '../screens/AMCContractsScreen';
import AMCContractDetailScreen from '../screens/AMCContractDetailScreen';

// Legacy Screens removed
// RequestScreen removed - using MarketplaceScreen instead
// RequestDetail removed - using BookingDetail instead
// RequestNow screen removed - use Cart screen instead
// RestaurantsScreen, PaymentUploadScreen, OrdersListScreen, CreateMarketplaceOrderScreen,
// CategoryDetailScreen, RestaurantCreateScreen, MenuManagementScreen, SupportTicketDetail
// removed - unreachable dead code with stale/nonexistent API endpoints (audited 2026-07-10)
import RestaurantView from '../screens/RestaurantView';
import BookingDetailScreen from '../screens/BookingDetailScreen';
import MainTabs from './MainTabs';
import SpendingReportsScreen from '../screens/SpendingReportsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [isChecking, setIsChecking] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Splash');

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        // Check both possible keys - screens save as 'user', authService saves as 'userData'
        const userData = await AsyncStorage.getItem('user') || await AsyncStorage.getItem('userData');

        // Wait 2.5 seconds to allow splash animation
        await new Promise(resolve => setTimeout(resolve, 2500));

        if (token) {
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
        <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="RestaurantOnboarding" component={RestaurantOnboarding} />
        <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        <Stack.Screen name="OwnerApprovalPending" component={OwnerApprovalPendingScreen} />
        <Stack.Screen name="TeamAccept" component={TeamAcceptScreen} />

        {/* Main App Screens */}
        <Stack.Screen name="Home" component={MainTabs} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
        <Stack.Screen name="MyRestaurants" component={MyRestaurantsScreen} />
        <Stack.Screen name="RestaurantEdit" component={RestaurantEditScreen} />
        <Stack.Screen name="RestaurantStatus" component={RestaurantStatusScreen} />
        <Stack.Screen name="TeamManagement" component={TeamManagementScreen} />
        <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
        <Stack.Screen name="Offers" component={OffersScreen} />
        <Stack.Screen name="Expenses" component={ExpensesScreen} />
        <Stack.Screen name="AddExpense" component={AddExpenseScreen} />
        <Stack.Screen name="ExpenseReports" component={ExpenseReportsScreen} />
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
        <Stack.Screen name="MarketplacePayment" component={MarketplacePaymentScreen} />

        {/* Search */}
        <Stack.Screen name="Search" component={SearchScreen} />

        {/* Equipment & Service Screens */}
        <Stack.Screen name="EquipmentProfile" component={EquipmentProfileScreen} />
        <Stack.Screen name="ServiceRequest" component={ServiceRequestScreen} />
        <Stack.Screen name="SupportCenter" component={SupportCenter} />
        <Stack.Screen name="SupportTicketDetail" component={SupportTicketDetailScreen} />
        <Stack.Screen name="CreateSupportTicket" component={CreateSupportTicketScreen} />

        {/* Profile Screens */}
        <Stack.Screen name="EditOwnerProfile" component={EditOwnerProfile} />
        <Stack.Screen name="Notifications" component={Notifications} />
        <Stack.Screen name="NotificationDetail" component={NotificationDetail} />

        {/* Phase 3: Advanced Feature Screens */}
        <Stack.Screen name="CategoryRequest" component={CategoryRequestScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="SlotBooking" component={SlotBookingScreen} />

        {/* Phase 4: Feature Parity Screens */}
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />

        {/* AMC Screens */}
        <Stack.Screen name="AMCDashboard" component={AMCDashboardScreen} />
        <Stack.Screen name="AMCRequest" component={AMCRequestScreen} />
        <Stack.Screen name="AMCRequestsList" component={AMCRequestsListScreen} />
        <Stack.Screen name="AMCRequestDetail" component={AMCRequestDetailScreen} />
        <Stack.Screen name="AMCContracts" component={AMCContractsScreen} />
        <Stack.Screen name="AMCContractDetail" component={AMCContractDetailScreen} />

        {/* RequestScreen, RequestDetail, RequestNow, Restaurants, OrdersList removed -
            unreachable dead code, see the comment near the top imports */}
        <Stack.Screen name="RestaurantView" component={RestaurantView} />
        <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      </Stack.Navigator>
    </SafeAreaProvider>
  );
}
