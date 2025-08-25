import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const OwnerDashboard = ({ navigation }) => {

  const getIcon = (item) => {
    switch (item.toLowerCase()) {
      case 'fridge':
        return 'fridge-outline';
      case 'oven':
        return 'stove';
      case 'grill':
        return 'fire';
      case 'sink':
        return 'sink';
      default:
        return 'tools';
    }
  };

  const equipmentList = ['Fridge', 'Oven', 'Grill', 'Sink'];

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, Rajesh 👋</Text>
          <Text style={styles.subGreeting}>Welcome to KNI Dashboard</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('AddLocation')}>
          <Icon name="add-location" size={height * 0.035} color="#EF3A3A" />
        </TouchableOpacity>
      </View>

      {/* STATS CARDS */}
      <View style={styles.statsRow}>
        {[
          { label: 'Requests', value: 5 },
          { label: 'Completed', value: 3 },
          { label: 'Pending', value: 2 },
        ].map((item, i) => (
          <View key={i} style={styles.statCard}>
            <Text style={styles.statNumber}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* EQUIPMENT FEED */}
        <Text style={styles.sectionTitle}>Equipment Available for Service</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {equipmentList.map((item, index) => (
            <View key={index} style={styles.equipmentCard}>
              <MaterialCommunityIcons
                name={getIcon(item)}
                size={height * 0.05}
                color="#1D2254"
                style={styles.equipIcon}
              />
              <Text style={styles.equipTitle}>{item}</Text>
              <TouchableOpacity style={styles.reqBtn}>
                <Text style={styles.reqText}>Request</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* MY REQUESTS */}
        <Text style={styles.sectionTitle}>My Service Requests</Text>
        <View style={styles.requestCard}>
          <Text style={styles.reqTitle}>Fridge Cleaning</Text>
          <Text style={styles.reqStatus}>Status: Pending</Text>
          <TouchableOpacity>
            <Text style={styles.viewLink}>View</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.requestCard}>
          <Text style={styles.reqTitle}>Grill Repair</Text>
          <Text style={styles.reqStatus}>Status: Completed</Text>
          <TouchableOpacity>
            <Text style={styles.viewLink}>Invoice</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <TouchableOpacity>
          <Icon name="home" size={height * 0.035} color="#EF3A3A" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Icon name="receipt-long" size={height * 0.035} color="#1D2254" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Icon name="person" size={height * 0.035} color="#1D2254" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OwnerDashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    paddingTop: height * 0.06,
    paddingHorizontal: width * 0.05,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: height * 0.028,
    fontWeight: '700',
    color: '#1D2254',
  },
  subGreeting: {
    color: '#888',
    fontSize: height * 0.017,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: height * 0.02,
  },
  statCard: {
    backgroundColor: '#FFF',
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    padding: height * 0.02,
    alignItems: 'center',
    elevation: 3,
  },
  statNumber: {
    fontSize: height * 0.027,
    fontWeight: 'bold',
    color: '#EF3A3A',
  },
  statLabel: {
    fontSize: height * 0.018,
    color: '#666',
  },
  sectionTitle: {
    fontSize: height * 0.022,
    fontWeight: '600',
    marginVertical: height * 0.015,
    color: '#1D2254',
  },
  equipmentCard: {
    backgroundColor: '#FFF',
    padding: height * 0.015,
    marginRight: 10,
    borderRadius: 10,
    width: width * 0.3,
    alignItems: 'center',
    elevation: 3,
  },
  equipIcon: {
    marginBottom: 8,
  },
  equipTitle: {
    fontSize: height * 0.018,
    fontWeight: '600',
    marginBottom: 6,
    color: '#1D2254',
  },
  reqBtn: {
    backgroundColor: '#EF3A3A',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  reqText: {
    color: '#FFF',
    fontSize: height * 0.016,
    fontWeight: '600',
  },
  requestCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: height * 0.02,
    marginBottom: 12,
    elevation: 2,
  },
  reqTitle: {
    fontSize: height * 0.02,
    fontWeight: '600',
    color: '#1D2254',
  },
  reqStatus: {
    fontSize: height * 0.017,
    color: '#EF3A3A',
    marginTop: 4,
  },
  viewLink: {
    color: '#4A90E2',
    marginTop: 6,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    backgroundColor: '#FFF',
    elevation: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});
