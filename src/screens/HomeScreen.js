import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';

const Home = ({ navigation }) => {
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [100, 60],
    extrapolate: 'clamp',
  });

 const heroBanners = [
  require('../assets/images/kitchen.jpeg'),
  require('../assets/images/repair.jpeg'),
  require('../assets/images/meals.jpeg'),
];


  const carouselItems = [
    { title: 'Deep Cleaning - Aug 10' },
    { title: 'Chimney Repair - Aug 12' },
    { title: 'Inspection - Aug 15' },
  ];

  const activities = [
    { id: 1, text: 'Oven Repair Request Submitted.', time: '2 hours ago' },
    { id: 2, text: 'Fridge Cleaning Completed.', time: 'Yesterday' },
    { id: 3, text: 'Ticket #122 Resolved.', time: 'Aug 3' },
  ];

  const activeTab = 'home';

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.header, { height: headerHeight }]}> 
        <View>
          <Text style={styles.greeting}>Hi, Saurav 👋</Text>
          <Text style={styles.subGreeting}>Saurav’s Kitchen</Text>
        </View>
        <View style={styles.statusBadge}>
          <Icon name="checkmark-circle" size={18} color="#2ecc71" />
          <Text style={styles.statusText}>Approved</Text>
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
       <ScrollView
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
  style={styles.heroContainer}
>
  {heroBanners.map((image, i) => (
    <View key={i} style={styles.heroSlide}>
      <Animated.Image source={image} style={styles.heroImage} resizeMode="cover" />
    </View>
  ))}
</ScrollView>


        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {[{ label: 'Request', icon: 'hammer-outline' },
            { label: 'Bills', icon: 'receipt-outline' },
            { label: 'Tickets', icon: 'ticket-outline' },
            { label: 'Dashboard', icon: 'analytics-outline' },
            { label: 'Settings', icon: 'settings-outline' },
            { label: 'Support', icon: 'call-outline' }].map((item, i) => (
              <TouchableOpacity key={i} style={styles.actionBtn} onPress={() => {
    if (item.label === 'Dashboard') {
      navigation.navigate('OwnerDashboard');
    } else {
       if (item.label === 'Request') {
      navigation.navigate('Request')
       
    }
    if (item.label === 'Bills') {
      navigation.navigate('Profile')
    }
    }
  }}>
                <Icon name={item.icon} size={26} color="#EF3A3A" />
                <Text style={styles.actionText}>{item.label}</Text>
              </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Upcoming Services</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={carouselItems}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.carouselCard}>
              <Icon name="calendar-outline" size={20} color="#EF3A3A" style={{ marginBottom: 6 }} />
              <Text style={styles.carouselText}>{item.title}</Text>
            </View>
          )}
          contentContainerStyle={{ paddingLeft: 4 }}
        />

        <Text style={styles.sectionTitle}>Activity Timeline</Text>
        {activities.map((item) => (
          <View key={item.id} style={styles.timelineItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="checkmark-done-circle" size={20} color="#EF3A3A" style={{ marginRight: 8 }} />
              <Text style={styles.activityText}>{item.text}</Text>
            </View>
            <Text style={styles.activityTime}>{item.time}</Text>
          </View>
        ))}

        <View style={styles.tipContainer}>
          <LottieView
            source={require('../assets/images/tip.json')}
            autoPlay loop
            style={{ width: 50, height: 50 }}
          />
          <Text style={styles.tipText}>💡 Tip: Update your restaurant profile regularly for faster approvals.</Text>
        </View>
      </Animated.ScrollView>

      <View style={styles.footer}>
        {[{ icon: 'home', label: 'Home', key: 'home' },
          { icon: 'newspaper', label: 'Feed', key: 'feed' },
          { icon: 'add-circle', label: 'Request', key: 'request' },
          { icon: 'person', label: 'Profile', key: 'profile' }].map((item, i) => (
            <TouchableOpacity key={i} style={styles.footerItem}>
              <Icon
                name={item.icon}
                size={24}
                color={activeTab === item.key ? '#EF3A3A' : '#999'}
              />
              <Text style={[styles.footerLabel, activeTab === item.key && { color: '#EF3A3A', fontWeight: '700' }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default Home;

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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eafaf1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    color: '#2ecc71',
    marginLeft: 6,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1D2254',
    marginTop: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  actionBtn: {
    backgroundColor: '#fff',
    width: '30%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
  },
  actionText: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
    color: '#1D2254',
  },
  carouselCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom:20,
    borderRadius: 14,
    elevation: 3,
    marginRight: 12,
    width: 260,
    alignItems: 'flex-start',
  },
  carouselText: {
    fontSize: 14,
    color: '#333',
  },
  timelineItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  tipContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    elevation: 3,
  },
  tipText: {
    marginLeft: 12,
    color: '#333',
    fontSize: 14,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#ddd',
    elevation: 10,
  },
  footerItem: {
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 12,
    color: '#1D2254',
    marginTop: 2,
  },
  heroContainer: {
    marginBottom: 25,
  },
  heroSlide: {
  width: 320,
  marginRight: 20,
  borderRadius: 10,
  overflow: 'hidden',
  elevation: 3,
},

heroImage: {
  width: '100%',
  height:200,
  borderRadius: 10,
},

});