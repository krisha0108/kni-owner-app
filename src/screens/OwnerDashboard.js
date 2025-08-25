// File: OwnerDashboard.js

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { PieChart } from 'react-native-chart-kit';

const OwnerDashboard = ({ navigation }) => {
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [100, 60],
    extrapolate: 'clamp',
  });

  const hotelList = [
    {
      name: 'The Spice Hub',
      status: 'Approved',
      location: 'Noida Sector 62',
      tickets: 3,
      expenses: '₹7,000',
      staff: 4,
      updated: '2 hrs ago'
    },
    {
      name: 'Curry Kingdom',
      status: 'Pending',
      location: 'Greater Noida',
      tickets: 2,
      expenses: '₹4,500',
      staff: 3,
      updated: '1 day ago'
    }
  ];

  const analyticsCards = [
    { title: 'Hotels', value: 3, icon: 'business' },
    { title: 'Expenses', value: '₹12K', icon: 'cash' },
    { title: 'Tickets', value: 5, icon: 'clipboard' },
    { title: 'Staff', value: 8, icon: 'people' },
    { title: 'Equipments', value: 16, icon: 'cog' },
    { title: 'Rating', value: '4.5⭐', icon: 'star' },
  ];

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.header, { height: headerHeight }]}> 
        <View>
          <Text style={styles.greeting}>Welcome back, Saurav 👋</Text>
          <Text style={styles.subGreeting}>Let’s manage your hotels smartly</Text>
        </View>
        <View style={styles.profileIcon}>
          <Icon name="person-circle" size={36} color="#EF3A3A" />
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Analytics Cards */}
        <View style={styles.analyticsRow}>
          {analyticsCards.map((item, i) => (
            <View key={i} style={styles.analyticsCard}>
              <Icon name={item.icon} size={24} color="#EF3A3A" />
              <Text style={styles.analyticsValue}>{item.value}</Text>
              <Text style={styles.analyticsTitle}>{item.title}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {['Add Hotel', 'Add Expense', 'Raise Ticket', 'Equipments', 'Reports', 'Settings'].map((label, i) => (
            <TouchableOpacity key={i} style={styles.quickBtn}>
              <Icon name="add-circle-outline" size={26} color="#EF3A3A" />
              <Text style={styles.quickText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hotels Overview */}
        <Text style={styles.sectionTitle}>Your Hotels</Text>
        {hotelList.map((hotel, i) => (
          <View key={i} style={styles.hotelCard}>
            <View style={styles.hotelHeader}>
              <Text style={styles.hotelTitle}>{hotel.name}</Text>
              <Text style={styles.hotelStatus}>{hotel.status}</Text>
            </View>
            <Text style={styles.hotelDetail}>📍 {hotel.location}</Text>
            <Text style={styles.hotelDetail}>🎫 Tickets: {hotel.tickets}</Text>
            <Text style={styles.hotelDetail}>💰 Expenses: {hotel.expenses}</Text>
            <Text style={styles.hotelDetail}>👥 Staff: {hotel.staff}</Text>
            <Text style={styles.hotelDetail}>⏱️ Last Updated: {hotel.updated}</Text>
          </View>
        ))}
      </Animated.ScrollView>
    </View>
  );
};

export default OwnerDashboard;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D2254',
  },
  subGreeting: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  profileIcon: {
    padding: 5,
  },
  analyticsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  analyticsCard: {
    backgroundColor: '#fff',
    width: '47%',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 10,
    marginBottom: 15,
    elevation: 2,
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 6,
    color: '#1D2254',
  },
  analyticsTitle: {
    fontSize: 13,
    color: '#777',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1D2254',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickBtn: {
    backgroundColor: '#fff',
    width: '30%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
  },
  quickText: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
    color: '#1D2254',
  },
  hotelCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    elevation: 3,
    marginBottom: 16,
  },
  hotelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  hotelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1D2254',
  },
  hotelStatus: {
    fontSize: 12,
    color: '#2ecc71',
    fontWeight: '600',
  },
  hotelDetail: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
});
  