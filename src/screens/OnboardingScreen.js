import React from 'react';
import {
  StyleSheet,
  Dimensions,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import LottieView from 'lottie-react-native';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const Done = ({ ...props }) => (
    <TouchableOpacity
      style={styles.doneButton}
      {...props}
    >
      <Text style={styles.doneText}>Let’s Go</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Onboarding
        bottomBarHighlight={false}
        showSkip={true}
        showNext={true}
        showDone={true}
        DoneButtonComponent={Done}
        onSkip={() => navigation.replace('RestaurantLogin')}
        onDone={() => navigation.replace('RestaurantLogin')}
        pages={[
          {
            backgroundColor: '#FFFFFF',
            image: (
              <LottieView
                source={require('../assets/images/gear.json')}
                autoPlay
                loop
                style={styles.image}
              />
            ),
            title: 'Manage Equipment Easily',
            subtitle: 'Track, schedule, and request services with just a tap.',
            titleStyles: styles.title,
            subTitleStyles: styles.subtitle,
          },
          {
            backgroundColor: '#F5F7FA',
            image: (
              <LottieView
                source={require('../assets/images/tracking.json')}
                autoPlay
                loop
                style={styles.image}
              />
            ),
            title: 'Live Service Monitoring',
            subtitle: 'Get real-time updates from field technicians.',
            titleStyles: styles.title,
            subTitleStyles: styles.subtitle,
          },
          {
            backgroundColor: '#EF3A3A',
            image: (
              <View style={styles.lastSlide}>
                <LottieView
                  source={require('../assets/images/dashboard.json')}
                  autoPlay
                  loop
                  style={styles.image}
                />
              </View>
            ),
            title: 'Role-Based Dashboards',
            subtitle: 'Designed separately for Restaurant Owners & Engineers.',
            titleStyles: styles.whiteTitle,
            subTitleStyles: styles.whiteSubtitle,
          },
        ]}
      />
    </SafeAreaView>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  image: {
    width: width * 0.75,
    height: height * 0.4,
  },
  lastSlide: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF3A3A',
    borderRadius: 20,
    padding: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1D2254',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  whiteTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  whiteSubtitle: {
    fontSize: 16,
    color: '#F5F5F5',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  doneButton: {
    marginRight: 18,
    backgroundColor: '#1D2254',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 25,
  },
  doneText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
