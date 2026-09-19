import React from 'react';
import {
  StyleSheet,
  Dimensions,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import LottieView from 'lottie-react-native';

import { scale, moderateScale } from '../utils/responsive';
const { width, height } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const Done = ({ ...props }) => (
    <TouchableOpacity style={[styles.doneButton, styles.buttonLift]} {...props}>
      <Text style={styles.doneText}>Let’s Go</Text>
    </TouchableOpacity>
  );

  const Next = ({ ...props }) => (
    <TouchableOpacity style={[styles.nextButton, styles.buttonLift]} {...props}>
      <Text style={styles.nextText}>Next</Text>
    </TouchableOpacity>
  );

  const Skip = ({ ...props }) => (
    <TouchableOpacity style={[styles.skipButton, styles.buttonLift]} {...props}>
      <Text style={styles.skipText}>Skip</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      <Onboarding
        bottomBarHighlight={false}
        showSkip={true}
        showNext={true}
        showDone={true}
        SkipButtonComponent={Skip}
        NextButtonComponent={Next}
        DoneButtonComponent={Done}
        onSkip={() => navigation.replace('RestaurantLogin')}
        onDone={() => navigation.replace('RestaurantLogin')}
        bottomBarHeight={height * 0.12} // 👈 lift bottom bar slightly
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
            subtitle:
              'Designed separately for Restaurant Owners & Engineers.',
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
    borderRadius: scale(20),
    padding: scale(10),
  },
  title: {
    fontSize: moderateScale(26),
    fontWeight: '800',
    color: '#1D2254',
    textAlign: 'center',
    marginBottom: scale(12),
  },
  subtitle: {
    fontSize: moderateScale(16),
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: scale(30),
  },
  whiteTitle: {
    fontSize: moderateScale(26),
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: scale(12),
  },
  whiteSubtitle: {
    fontSize: moderateScale(16),
    color: '#F5F5F5',
    textAlign: 'center',
    paddingHorizontal: scale(30),
  },

  // 🔹 ORIGINAL BUTTON STYLES (unchanged)
  doneButton: {
    marginRight: scale(18),
    backgroundColor: '#1D2254',
    paddingVertical: scale(10),
    paddingHorizontal: scale(22),
    borderRadius: scale(25),
  },
  doneText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: moderateScale(15),
  },
  nextButton: {
    marginRight: scale(5),
    // backgroundColor: '#1D2254',
    paddingVertical: scale(10),
    paddingHorizontal: scale(22),
    borderRadius: scale(25),
  },
  nextText: {
    color: '#1D2254',
    fontWeight: '600',
    fontSize: moderateScale(15),
  },
  skipButton: {
    marginLeft: scale(5),
    paddingVertical: scale(10),
    paddingHorizontal: scale(22),
    borderRadius: scale(25),
  },
  skipText: {
    color: '#1D2254',
    fontWeight: '600',
    fontSize: moderateScale(15),
  },

  // 🔹 JUST LIFT BUTTONS UP A BIT (NO STYLE CHANGE)
  buttonLift: {
    marginBottom: height * 0.00, // moves all buttons slightly upward
  },
});
