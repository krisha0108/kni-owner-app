import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Animated, Dimensions
} from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const logoAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate opacity + scale
    Animated.parallel([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        })
      ).start(),
    ]).start();

    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Subtle red circle background */}
      <View style={styles.circleBg} />

      {/* Rotating Gear Behind Logo */}
    

      {/* Main Logo */}
      <Animated.Image
        source={require('../assets/images/kni-logo.png')}
        style={[styles.logo, {
          opacity: logoAnim,
          transform: [{ scale: scaleAnim }]
        }]}
        resizeMode="contain"
      />

      {/* Spark Animation */}
      <LottieView
        source={require('../assets/images/spark.json')}
        autoPlay
        loop={true}
        style={styles.spark}
      />

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: logoAnim }]}>
        Empowering Kitchen Service Management
      </Animated.Text>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBg: {
    position: 'absolute',
    width: height * 0.55,
    height: height * 0.55,
    backgroundColor: '#EF3A3A',
    borderRadius: height,
    top: height * 0.2,
    left: width / 2 - height * 0.275,
    opacity: 0.2,
    zIndex: 0,
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
    zIndex: 2,
  },
  tagline: {
    color: '#1D2254',
    fontSize: 16,
    marginTop: 25,
    fontWeight: '600',
    zIndex: 2,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  gearContainer: {
    position: 'absolute',
    zIndex: 1,
    width: width * 0.55,
    height: width * 0.55,
  },
  gear: {
    width: '100%',
    height: '100%',
  },
  spark: {
    position: 'absolute',
    top: height / 2 - width * 0.50,
    left: width / 2 - width * 0.25,
    width: width * 0.5,
    height: width * 0.5,
    zIndex: 3,
  },
});
