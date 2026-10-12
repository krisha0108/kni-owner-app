import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, StatusBar, Animated, Easing, Dimensions, Platform } from 'react-native';
import Svg, {
  Circle, Path, G, Rect, Defs, RadialGradient, Stop, Line, Ellipse, ClipPath,
} from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { moderateScale } from '../utils/responsive';
import { api } from '../api/client';

const { width, height } = Dimensions.get('window');

// Mockup was authored against a 220px-wide reference frame; scale every
// geometry value from it by this factor so proportions match on real screens.
const F = width / 220;

const SPLASH_DURATION = 2500; // matches AppNavigator's auth-check hold

// ---- small reusable SVG pieces, ported 1:1 from the approved mockup ----

function DiyaChain({ variant }) {
  const isLong = variant === 'long';
  const beadCount = isLong ? 13 : 7;
  const flameY = isLong ? 54 : 30;
  const viewH = isLong ? 84 : 60;
  const beads = [];
  for (let i = 0; i < beadCount; i++) {
    beads.push(<Circle key={i} cx="16" cy={3 + i * 4} r="1.1" fill="#c9972e" />);
  }
  return (
    <Svg width={32 * F} height={viewH * F} viewBox={`0 0 32 ${viewH}`}>
      {beads}
      <G transform={`translate(16,${flameY})`}>
        <Path d="M0,0 C-3,4 -3,9 0,13 C3,9 3,4 0,0 Z" fill="#f3a53c" />
        <Path d="M-1.8,2 C-3,5 -3,8 0,11 C3,8 3,5 1.8,2" fill="#ffd27a" opacity={0.85} />
        <Line x1="0" y1="13" x2="0" y2="15" stroke="#5a3a1a" strokeWidth="0.9" />
        <G transform="translate(0,15)">
          <Path d="M-15,0 Q0,11 15,0 Q0,6 -15,0 Z" fill="#9c2b3c" />
          <Path d="M-15,0 Q0,-2.5 15,0" fill="none" stroke="#d9a940" strokeWidth="1.6" />
          <Path d="M-15,0 Q0,11 15,0" fill="none" stroke="#8a2332" strokeWidth="0.6" opacity={0.5} />
          <Circle cx="-4" cy="3" r="1.5" fill="#d9a940" />
          <G stroke="#d9a940" strokeWidth="0.8">
            <Line x1="-4" y1="0.9" x2="-4" y2="1.8" />
            <Line x1="-4" y1="4.2" x2="-4" y2="5.1" />
            <Line x1="-6.1" y1="3" x2="-5.2" y2="3" />
            <Line x1="-2.8" y1="3" x2="-1.9" y2="3" />
          </G>
        </G>
      </G>
    </Svg>
  );
}

function Mandala({ size }) {
  const outerAngles = Array.from({ length: 12 }, (_, i) => i * 30);
  const dotAngles = Array.from({ length: 12 }, (_, i) => 15 + i * 30);
  const innerAngles = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <Svg width={size} height={size} viewBox="0 0 180 180">
      <Circle cx="90" cy="90" r="74" fill="none" stroke="#d9a16f" strokeWidth="0.8" />
      <Circle cx="90" cy="90" r="58" fill="none" stroke="#d9a16f" strokeWidth="0.8" />
      <Circle cx="90" cy="90" r="22" fill="none" stroke="#d9a16f" strokeWidth="0.8" />
      {outerAngles.map((a) => (
        <G key={`o${a}`} transform={`translate(90,90) rotate(${a})`}>
          <Path d="M0,-74 C6,-62 6,-50 0,-42 C-6,-50 -6,-62 0,-74 Z" fill="none" stroke="#d2935f" strokeWidth="1" />
        </G>
      ))}
      {dotAngles.map((a) => (
        <G key={`d${a}`} transform={`translate(90,90) rotate(${a})`}>
          <Circle cx="0" cy="-50" r="1.4" fill="#d2935f" />
        </G>
      ))}
      {innerAngles.map((a) => (
        <G key={`i${a}`} transform={`translate(90,90) rotate(${a})`}>
          <Path d="M0,-34 L6.5,-26 L0,-18 L-6.5,-26 Z" fill="#d9a16f" fillOpacity={0.3} stroke="#d2935f" strokeWidth="0.6" />
        </G>
      ))}
      <Circle cx="90" cy="90" r="2.2" fill="#d2935f" />
    </Svg>
  );
}

function DandiyaStick({ clipId, rotateDeg }) {
  const colors = ['#c23b4c', '#d9a940', '#c23b4c', '#d9a940', '#c23b4c', '#d9a940', '#c23b4c'];
  return (
    <Svg width={86 * F} height={18 * F} viewBox="0 0 92 18" style={{ transform: [{ rotate: `${rotateDeg}deg` }] }}>
      <Defs>
        <ClipPath id={clipId}>
          <Rect x="3" y="5" width="84" height="8" rx="4" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        {colors.map((c, i) => <Rect key={i} x={3 + i * 12} y="5" width="12" height="8" fill={c} />)}
      </G>
      <Circle cx="7" cy="9" r="4.4" fill="#8a2332" />
      <Circle cx="83" cy="9" r="4.4" fill="#8a2332" />
      <G stroke="#c23b4c" strokeWidth="1.1" strokeLinecap="round">
        <Line x1="83" y1="13" x2="80" y2="18" />
        <Line x1="85" y1="13.4" x2="85" y2="18.6" />
        <Line x1="87" y1="13" x2="90" y2="18" />
      </G>
    </Svg>
  );
}

function BottomDiya({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 38">
      <Ellipse cx="20" cy="30" rx="9" ry="2" fill="#8a6a2e" opacity={0.3} />
      <Rect x="16" y="26" width="8" height="4" rx="1.6" fill="#8a6a2e" />
      <Path d="M3,23 Q20,34 37,23 Q20,30 3,23 Z" fill="#b8862f" />
      <Path d="M3,23 Q20,34 37,23" fill="none" stroke="#8a6a2e" strokeWidth="0.8" opacity={0.55} />
      <Ellipse cx="20" cy="22.5" rx="16.5" ry="3.2" fill="none" stroke="#8a6a2e" strokeWidth="0.8" opacity={0.4} />
      <Path d="M20,20 C15,14 15,7 20,0 C25,7 25,14 20,20 Z" fill="#f3a53c" />
      <Path d="M20,18 C17.3,14 17.3,9 20,4.5 C22.7,9 22.7,14 20,18 Z" fill="#ffd27a" opacity={0.85} />
    </Svg>
  );
}

function Petal({ leftPercent, delay, duration, driftX, rotateDir }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [v, duration, delay]);

  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [-10, height * 0.95] });
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [0, driftX] });
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${rotateDir * 260}deg`] });
  const opacity = v.interpolate({ inputRange: [0, 0.08, 0.92, 1], outputRange: [0, 0.85, 0.6, 0.5], extrapolate: 'clamp' });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.petal,
        { left: `${leftPercent}%`, opacity, transform: [{ translateY }, { translateX }, { rotate }] },
      ]}
    />
  );
}

const DIYAS = [
  { left: 14, variant: 'long' },
  { left: 46, variant: 'short' },
  { left: 122, variant: 'short' },
  { left: 154, variant: 'long' },
];

const PETALS = [
  { leftPercent: 14, delay: 0, duration: 2600, driftX: 18, rotateDir: 1 },
  { leftPercent: 78, delay: 300, duration: 2500, driftX: -22, rotateDir: -1 },
  { leftPercent: 40, delay: 800, duration: 2600, driftX: 18, rotateDir: 1 },
  { leftPercent: 88, delay: 1100, duration: 2400, driftX: -22, rotateDir: -1 },
  { leftPercent: 6, delay: 1400, duration: 2400, driftX: 18, rotateDir: 1 },
];

const mandalaSize = 178 * F;
const logoBadgeSize = 38 * F;

const SplashScreen = ({ navigation }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: SPLASH_DURATION,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  useEffect(() => {
    let isMounted = true;

    const checkAuthState = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        // Check both possible keys - screens save as 'user', authService saves as 'userData'
        const userData = await AsyncStorage.getItem('user') || await AsyncStorage.getItem('userData');

        // Wait for the splash animation to finish
        await new Promise((resolve) => setTimeout(resolve, SPLASH_DURATION));
        if (!isMounted) return;

        let nextRoute = 'Onboarding';
        if (token) {
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
          nextRoute = 'Home';
        }
        navigation.reset({ index: 0, routes: [{ name: nextRoute }] });
      } catch (error) {
        console.log('Auth check error:', error);
        if (isMounted) navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
      }
    };

    checkAuthState();
    return () => { isMounted = false; };
  }, [navigation]);

  const fade = (range) => progress.interpolate({ inputRange: range, outputRange: [0, 1], extrapolate: 'clamp' });

  const diyaOpacity = fade([0, 0.18]);
  const diyaTranslateY = progress.interpolate({ inputRange: [0, 0.18], outputRange: [-28, 0], extrapolate: 'clamp' });
  const diyaRotate = progress.interpolate({
    inputRange: [0, 0.18, 0.22, 0.26, 0.3],
    outputRange: ['-6deg', '5deg', '-4deg', '2deg', '0deg'],
    extrapolate: 'clamp',
  });
  const diyaAnimStyle = { opacity: diyaOpacity, transform: [{ translateY: diyaTranslateY }, { rotate: diyaRotate }] };

  const mandalaAnimStyle = {
    opacity: fade([0.16, 0.28]),
    transform: [{ scale: progress.interpolate({ inputRange: [0.16, 0.28], outputRange: [0.85, 1], extrapolate: 'clamp' }) }],
  };
  const badgeAnimStyle = {
    opacity: fade([0.24, 0.36]),
    transform: [{ scale: progress.interpolate({ inputRange: [0.24, 0.36], outputRange: [0.75, 1], extrapolate: 'clamp' }) }],
  };
  const brandAnimStyle = { opacity: fade([0.24, 0.36]) };
  const happyAnimStyle = { opacity: fade([0.33, 0.45]) };
  const navratriAnimStyle = {
    opacity: fade([0.37, 0.49]),
    transform: [{ translateY: progress.interpolate({ inputRange: [0.37, 0.49], outputRange: [6, 0], extrapolate: 'clamp' }) }],
  };
  const lotusAnimStyle = { opacity: fade([0.41, 0.53]) };
  const taglineAnimStyle = { opacity: fade([0.45, 0.57]) };
  const bottomAnimStyle = { opacity: fade([0.49, 0.61]) };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#fdf2ec" barStyle="dark-content" />

      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="bgGrad" cx="50%" cy="30%" r="75%">
            <Stop offset="0%" stopColor="#fdf2ec" stopOpacity={1} />
            <Stop offset="45%" stopColor="#fbe6dd" stopOpacity={1} />
            <Stop offset="100%" stopColor="#f6d9ce" stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#bgGrad)" />
      </Svg>

      {PETALS.map((p, i) => <Petal key={i} {...p} />)}

      <View style={styles.diyaRow} pointerEvents="none">
        {DIYAS.map((d, i) => (
          <Animated.View key={i} style={[styles.diyaWrap, { left: d.left * F }, diyaAnimStyle]}>
            <DiyaChain variant={d.variant} />
          </Animated.View>
        ))}
      </View>

      <View style={styles.centerColumn} pointerEvents="none">
        <View style={[styles.mandalaBox, { width: mandalaSize, height: mandalaSize }]}>
          <Animated.View style={[StyleSheet.absoluteFill, mandalaAnimStyle]}>
            <Mandala size={mandalaSize} />
          </Animated.View>
          <Animated.View style={[styles.badgeCenter, badgeAnimStyle]}>
            <Image
              source={require('../assets/images/kni-icon.png')}
              style={{ width: logoBadgeSize, height: logoBadgeSize }}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        <Animated.View style={brandAnimStyle}>
          <Text style={styles.brandTitle}>KITCHEN NETWORK</Text>
          <Text style={styles.brandSub}>INTERNATIONAL</Text>
        </Animated.View>

        <Animated.View style={[styles.happyRow, happyAnimStyle]}>
          <View style={styles.happyLine} />
          <Text style={styles.happyText}>HAPPY</Text>
          <View style={styles.happyLine} />
        </Animated.View>

        <Animated.View style={navratriAnimStyle}>
          <Text style={styles.scriptText}>Navratri</Text>
        </Animated.View>

        <Animated.View style={[styles.lotusRow, lotusAnimStyle]}>
          <View style={styles.lotusLine} />
          <Svg width={14 * F} height={14 * F} viewBox="0 0 24 24">
            <Path d="M12 2 C13 7 16 9 20 10 C16 11 13 14 12 19 C11 14 8 11 4 10 C8 9 11 7 12 2 Z" fill="#c9972e" />
          </Svg>
          <View style={styles.lotusLine} />
        </Animated.View>

        <Animated.Text style={[styles.taglineText, taglineAnimStyle]}>
          Empowering Kitchen Service Management
        </Animated.Text>
      </View>

      <Animated.View style={[styles.bottomScene, bottomAnimStyle]} pointerEvents="none">
        <View style={[styles.stickWrap, { left: 27 * F, bottom: 6 * F }]}>
          <DandiyaStick clipId="stickClipA" rotateDeg={14} />
        </View>
        <View style={[styles.stickWrap, { left: 27 * F, bottom: 6 * F }]}>
          <DandiyaStick clipId="stickClipB" rotateDeg={-14} />
        </View>
        <View style={[styles.bottomDiyaWrap, { right: 24 * F, bottom: 2 * F }]}>
          <BottomDiya size={32 * F} />
        </View>
      </Animated.View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf2ec',
  },
  petal: {
    position: 'absolute',
    top: 0,
    width: 7 * F,
    height: 9 * F,
    backgroundColor: '#e2748a',
    borderTopRightRadius: 7 * F,
    borderBottomLeftRadius: 7 * F,
  },
  diyaRow: {
    position: 'absolute',
    top: -6,
    left: 0,
    right: 0,
    height: 90 * F,
  },
  diyaWrap: {
    position: 'absolute',
    top: 0,
  },
  centerColumn: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mandalaBox: {
    marginBottom: 8,
  },
  badgeCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    textAlign: 'center',
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: '#1D2254',
    letterSpacing: 0.5,
  },
  brandSub: {
    textAlign: 'center',
    fontSize: moderateScale(7.5),
    fontWeight: '600',
    color: '#1D2254',
    letterSpacing: 1.6,
    marginTop: 1,
  },
  happyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
  },
  happyLine: {
    width: 16,
    height: 1,
    backgroundColor: '#c9972e',
  },
  happyText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    letterSpacing: 4,
    color: '#c9972e',
  },
  scriptText: {
    marginTop: 4,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    fontStyle: 'italic',
    fontWeight: '700',
    fontSize: moderateScale(26),
    color: '#c23b4c',
  },
  lotusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
  },
  lotusLine: {
    width: 20,
    height: 1,
    backgroundColor: '#c9972e',
  },
  taglineText: {
    marginTop: 14,
    width: 220 * F,
    textAlign: 'center',
    fontSize: moderateScale(9.5),
    fontWeight: '500',
    color: '#1D2254',
  },
  bottomScene: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 34 * F,
    height: 56 * F,
  },
  stickWrap: {
    position: 'absolute',
  },
  bottomDiyaWrap: {
    position: 'absolute',
  },
});
