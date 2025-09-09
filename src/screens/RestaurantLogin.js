
// import React, { useEffect, useMemo, useState } from 'react';
// import {
//   View, Text, TextInput, TouchableOpacity, StyleSheet,
//   StatusBar, Image, KeyboardAvoidingView, Platform, ActivityIndicator
// } from 'react-native';
// import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// import LinearGradient from 'react-native-linear-gradient';
// import Icon from 'react-native-vector-icons/Ionicons';
// import { api } from '../api/client';
// import auth from '@react-native-firebase/auth';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// const C = {
//   primary:'#EF3A3A', ink:'#1D2254', bg:'#F5F7FA', card:'#FFFFFF',
//   text:'#0F172A', muted:'#6B7280', border:'#E5E7EB'
// };
// export default function RestaurantLogin({ navigation }) {
//   const insets = useSafeAreaInsets();
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [secure, setSecure] = useState(true);
//   const [error, setError] = useState('');
//   const [gLoading, setGLoading] = useState(false);
//   const [pLoading, setPLoading] = useState(false);
//   useEffect(() => {
//     GoogleSignin.configure({
//       webClientId: '851628336447-uccg7n0mbg4g2mlvb5g8nr9r55s4oje2.apps.googleusercontent.com', // <-- from Firebase (Web)
//       offlineAccess: false,
//       forceCodeForRefreshToken: false,
//     });
//   }, []);

//   const validate = () => {
//     if (!email?.trim() || !password?.trim()) {
//       setError('Please enter both email/phone and password.');
//       return false;
//     }
//     setError('');
//     return true;
//   };

// const handleLogin = async () => {
//   if (!email || !password) return alert('Enter email and password');
//   setPLoading(true);
//   try {
//     const res = await api.post('/restaurant/login', { email, password });
//     if (res.data?.status) {
//       const token = res.data?.token;
//       if (token) {
//         await AsyncStorage.setItem('APP_TOKEN', token);
//         await AsyncStorage.setItem('userToken', token);
//         api.defaults.headers.common.Authorization = `Bearer ${token}`;
//       }
//       if (res.data?.data) {
//         const owner = res.data.data;
//         await AsyncStorage.setItem('ownerData', JSON.stringify(owner));
//         if (owner?.id) await AsyncStorage.setItem('ownerId', String(owner.id));
//       }
//       await AsyncStorage.setItem('authProvider', 'password');  // <— important
//       navigation.replace('Home');
//     } else {
//       alert(res.data?.message || 'Invalid credentials');
//     }
//   } catch (err) {
//     console.log('Login error:', err?.response?.data || err.message);
//     alert(err?.response?.data?.message || 'Invalid credentials');
//   } finally {
//     setPLoading(false);
//   }
// };
//   const handleGoogle = async () => {
//   try {
//     setGLoading(true);
//     setError('');
//     await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
//     // Ask Google
//     // const signInRes = await GoogleSignin.signIn(); // { idToken?, user, ... }
//     const signInRes = await GoogleSignin.signIn({ prompt: 'select_account' });
//     let { idToken } = signInRes || {};
//     // If idToken is missing, try to fetch tokens explicitly
//     if (!idToken) {
//       const tokenRes = await GoogleSignin.getTokens(); // { idToken?, accessToken? }
//       idToken = tokenRes?.idToken;
//       var accessToken = tokenRes?.accessToken;
//     }
//     if (!idToken && !accessToken) {
//       throw new Error('Google Sign-In did not return idToken or accessToken');
//     }
//     // Build Firebase credential (idToken preferred, else accessToken)
//     const credential = auth.GoogleAuthProvider.credential(idToken || null, accessToken || null);
//     // Sign into Firebase
//     await auth().signInWithCredential(credential);
//     // Get Firebase JWT for your backend
//     const firebaseIdToken = await auth().currentUser.getIdToken(true);
//     // Hit your Laravel endpoint
//     const res = await api.post(`/owner/auth/firebase`, {
//       idToken: firebaseIdToken,
//     });
//     const { token } = res.data || {};
//     console.log('[Google sign-in success]', res.data); 
//     if (!token) throw new Error('No token from server');
//     await AsyncStorage.setItem('APP_TOKEN', token);
//     api.defaults.headers.common.Authorization = `Bearer ${token}`;

//       if (token) {
//           await AsyncStorage.setItem('APP_TOKEN', token);
//         await AsyncStorage.setItem('userToken', token);
//         await AsyncStorage.setItem('ownerData', JSON.stringify(res.data.owner));
//         await AsyncStorage.setItem('ownerId', String(res.data.owner?.id));
//         api.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
//       }
//     // const who = data || owner || user;
//     // if (who?.id) await AsyncStorage.setItem('ownerId', String(who.id));
//     // if (who) await AsyncStorage.setItem('ownerData', JSON.stringify(who));

//     navigation.replace('Home');
//   } catch (e) {
//     // Helpful logging:
//     console.log('[Google sign-in error]', e?.message, e); -
//     console.log('status:', e?.response?.status);
//   console.log('data:', e?.response?.data); // <- shows SQL/message from server
//     setError(
//       e?.message?.includes('idToken') || e?.message?.includes('accessToken')
//         ? 'Google sign-in failed to retrieve a token. Check Web client ID & SHA keys.'
//         : 'Google sign-in failed. Please try again.'
//     );
//   } finally {
//     setGLoading(false);
//   }
// };


//   return (
//     <SafeAreaView style={{ flex:1, backgroundColor:C.bg }} edges={['top','left','right']}>
//       <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
//       {/* animated-feel gradient header */}
//       <LinearGradient
//         colors={['#FFEEEE', '#FFD6D6', '#EF3A3A']}
//         start={{x:0.1,y:0}}
//         end={{x:1,y:1}}
//         style={[styles.header, { paddingTop: insets.top + 12 }]}
//       >
//       </LinearGradient>
//       <KeyboardAvoidingView
//         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
//         style={{ flex:1 }}
//       >
//         {/* glass card */}
//         <View style={styles.cardWrap}>
//           <View style={styles.card}>
//             <View style={styles.brandPill}>
//           <Image source={require('../assets/images/kni-logo.png')} style={styles.logoSmall}/>
//         </View>
//             <Text style={styles.title}>Restaurant Owner Login</Text>
//             {/* email */}
//             <View style={styles.inputWrap}>
//               <Icon name="mail-outline" size={18} color="#9CA3AF" />
//               <TextInput
//                 placeholder="Email or Phone"
//                 placeholderTextColor="#9CA3AF"
//                 value={email}
//                 onChangeText={setEmail}
//                 autoCapitalize="none"
//                 keyboardType="email-address"
//                 style={styles.input}
//               />
//             </View>
//             {/* password */}
//             <View style={styles.inputWrap}>
//               <Icon name="lock-closed-outline" size={18} color="#9CA3AF" />
//               <TextInput
//                 placeholder="Password"
//                 placeholderTextColor="#9CA3AF"
//                 value={password}
//                 onChangeText={setPassword}
//                 secureTextEntry={secure}
//                 style={styles.input}
//               />
//               <TouchableOpacity onPress={()=>setSecure(s=>!s)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
//                 <Icon name={secure ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
//               </TouchableOpacity>
//             </View>
//             {/* subtle error (no default alert) */}
//             {!!error && <Text style={styles.error}>{error}</Text>}
//             {/* primary CTA */}
//            <TouchableOpacity style={[styles.primaryBtn, {opacity: pLoading ? 0.7 : 1}]} onPress={handleLogin} disabled={pLoading || gLoading}>
//               {pLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Login</Text>}
//             </TouchableOpacity>
//             {/* divider */}
//             <View style={styles.dividerRow}>
//               <View className="divider" style={styles.divider} />
//               <Text style={styles.dividerTxt}>or continue with</Text>
//               <View className="divider" style={styles.divider} />
//             </View>
//             {/* Google button */}
//           <TouchableOpacity style={[styles.googleBtn, {opacity: gLoading ? 0.7 : 1}]} onPress={handleGoogle} disabled={gLoading || pLoading}>
//               <View style={styles.googleIcon}>
//                 {gLoading ? <ActivityIndicator /> : <Icon name="logo-google" size={18} color="#4285F4" />}
//               </View>
//               <Text style={styles.googleTxt}>Sign in with Google</Text>
//             </TouchableOpacity>
//             {/* secondary row */}
//             <View style={styles.bottomRow}>
//               <TouchableOpacity onPress={()=>navigation.navigate('RestaurantRegister')}>
//                 <Text style={styles.linkRed}>Create an account</Text>
//               </TouchableOpacity>
//               <TouchableOpacity onPress={()=>navigation.navigate('RestaurantOnboarding')}>
//                 <Text style={styles.linkMuted}>Forgot password?</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//         {/* terms */}
//         <View style={[styles.terms, { paddingBottom: insets.bottom + 8 }]}>
//           <Text style={styles.termsTxt}>
//             By continuing you agree to our <Text style={styles.linkMuted}>Terms</Text> & <Text style={styles.linkMuted}>Privacy</Text>.
//           </Text>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }
// const styles = StyleSheet.create({
//   header:{
//     height: 140,
//     justifyContent:'flex-end',
//     paddingHorizontal:16,
//   },
//   brandPill:{
//     width:'80%',
//     zIndex:10,
//     height:60,
//     justifyContent:'center',
//     alignSelf:'center',
//     alignItems:'center',
//   },
//   logoSmall:{ width:120, height:120, resizeMode:'contain' },
//   cardWrap:{ flex:1, alignItems:'center', marginTop:-28 },
//   card:{
//     width:'90%',
//     backgroundColor:'rgba(255,255,255,0.9)',
//     borderRadius:20,
//     borderWidth:1, borderColor:'#EEF2F7',
//     padding:18,
//     shadowColor:'#000', shadowOpacity:0.08, shadowRadius:18, elevation:6,
//   },
//   title:{ fontSize:22, fontWeight:'900', color:'#1D2254', textAlign:'center',marginTop:16, marginBottom:14 },
//   inputWrap:{
//     flexDirection:'row', alignItems:'center',
//     backgroundColor:'#fff',
//     borderWidth:1, borderColor:'#E5E7EB',
//     borderRadius:14,
//     paddingHorizontal:12, paddingVertical:12,
//     marginBottom:12,
//   },
//   input:{ flex:1, marginLeft:10, color:'#0F172A' },
//   error:{ color:'#DC2626', fontWeight:'700', marginBottom:8, textAlign:'center' },
//   primaryBtn:{
//     backgroundColor:'#EF3A3A',
//     borderRadius:14, paddingVertical:14,
//     alignItems:'center', marginTop:2,
//     shadowColor:'#EF3A3A', shadowOpacity:0.35, shadowRadius:10, elevation:4,
//   },
//   primaryTxt:{ color:'#fff', fontWeight:'900', letterSpacing:0.2 },
//   dividerRow:{ flexDirection:'row', alignItems:'center', marginVertical:14 },
//   divider:{ flex:1, height:1, backgroundColor:'#E5E7EB' },
//   dividerTxt:{ marginHorizontal:8, color:'#6B7280', fontWeight:'700' },
//   googleBtn:{
//     flexDirection:'row', alignItems:'center', justifyContent:'center',
//     backgroundColor:'#fff',
//     borderRadius:14, borderWidth:1, borderColor:'#E5E7EB',
//     paddingVertical:12,
//   },
//   googleIcon:{
//     width:28, height:28, borderRadius:8, backgroundColor:'#F1F5FF',
//     alignItems:'center', justifyContent:'center', marginRight:8,
//   },
//   googleTxt:{ color:'#1D2254', fontWeight:'800' },
//   bottomRow:{ marginTop:14, flexDirection:'row', justifyContent:'space-between' },
//   linkRed:{ color:'#EF3A3A', fontWeight:'800' },
//   linkMuted:{ color:'#6B7280', fontWeight:'700' },
//   terms:{ alignItems:'center', paddingHorizontal:16, marginTop:8 },
//   termsTxt:{ color:'#94A3B8', textAlign:'center' },
// });


import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, Image, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
const C = {
  primary:'#EF3A3A', ink:'#1D2254', bg:'#F5F7FA', card:'#FFFFFF',
  text:'#0F172A', muted:'#6B7280', border:'#E5E7EB'
};
export default function RestaurantLogin({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState('');
  const [gLoading, setGLoading] = useState(false);
  const [pLoading, setPLoading] = useState(false);
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '851628336447-uccg7n0mbg4g2mlvb5g8nr9r55s4oje2.apps.googleusercontent.com', // <-- from Firebase (Web)
      offlineAccess: false,
      forceCodeForRefreshToken: false,
    });
    
    // Auto-fill email and password if coming from registration
    if (route?.params?.prefillEmail) {
      setEmail(route.params.prefillEmail);
    }
    if (route?.params?.prefillPassword) {
      setPassword(route.params.prefillPassword);
    }
  }, [route?.params]);

  const validate = () => {
    if (!email?.trim() || !password?.trim()) {
      setError('Please enter both email/phone and password.');
      return false;
    }
    setError('');
    return true;
  };

const handleLogin = async () => {
  if (!email || !password) return alert('Enter email and password');
  setPLoading(true);
  try {
    const res = await api.post('/restaurant/login', { email, password });
    if (res.data?.status) {
      const token = res.data?.token;
      const owner = res.data?.data;
      
      // Store tokens
     // ✅ Store tokens
if (token) {
  await AsyncStorage.setItem('userToken', token); // only 1 key
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

      
    // ✅ Store user data
if (owner) {
  await AsyncStorage.setItem('user', JSON.stringify(owner));
  if (owner?.id) {
    await AsyncStorage.setItem('ownerId', String(owner.id));
  }
}
      
      // 🔥 Get and store FCM token
      try {
        const fcmToken = await messaging().getToken();
        console.log('FCM Token:', fcmToken);
        if (fcmToken && owner?.id) {
          console.log('FCM Token obtained:', fcmToken);
          
          // Send FCM token to backend
          const fcmResponse = await api.post('/owners/save-fcm-token', {
            restaurant_owner_id: owner.id,
            fcm_token: fcmToken
          });
          
          
          console.log('FCM token response:', fcmResponse.data);
          console.log('FCM token saved to backend successfully');
        } else {
          console.log('No FCM token or owner ID available');
        }
      } catch (fcmError) {
        console.log('FCM token error:', fcmError.message);
      }
      
      await AsyncStorage.setItem('authProvider', 'password');
      navigation.replace('Home');
    } else {
      alert(res.data?.message || 'Invalid credentials');
    }
  } catch (err) {
    console.log('Login error:', err?.response?.data || err.message);
    alert(err?.response?.data?.message || 'Invalid credentials');
  } finally {
    setPLoading(false);
  }
};
  const handleGoogle = async () => {
  try {
    setGLoading(true);
    setError('');
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    const signInRes = await GoogleSignin.signIn();
    let { idToken } = signInRes || {};
    
    if (!idToken) {
      const tokenRes = await GoogleSignin.getTokens();
      idToken = tokenRes?.idToken;
      var accessToken = tokenRes?.accessToken;
    }
    
    if (!idToken && !accessToken) {
      throw new Error('Google Sign-In did not return idToken or accessToken');
    }
    
    const credential = auth.GoogleAuthProvider.credential(idToken || null, accessToken || null);
    await auth().signInWithCredential(credential);
    const firebaseIdToken = await auth().currentUser.getIdToken(true);
    
    const res = await api.post(`/owner/auth/firebase`, {
      idToken: firebaseIdToken,
    });
    
    const { token } = res.data || {};
    const owner = res.data?.owner;
    
    if (!token) throw new Error('No token from server');
    
    // Store tokens
  // ✅ Store token
await AsyncStorage.setItem('userToken', token);
api.defaults.headers.common.Authorization = `Bearer ${token}`;

// ✅ Store user data
if (owner) {
  await AsyncStorage.setItem('user', JSON.stringify(owner));
  if (owner?.id) {
    await AsyncStorage.setItem('ownerId', String(owner.id));
  }
}

    
    // 🔥 Get and store FCM token
    try {
      const fcmToken = await messaging().getToken();
      if (fcmToken && owner?.id) {
        console.log('FCM Token obtained:', fcmToken);
        
        // Send FCM token to backend
        const fcmResponse = await api.post('/owners/save-fcm-token', {
          restaurant_owner_id: owner.id,
          fcm_token: fcmToken
        });
        
        console.log('FCM token response:', fcmResponse.data);
        console.log('FCM token saved to backend successfully');
      } else {
        console.log('No FCM token or owner ID available');
      }
    } catch (fcmError) {
      console.log('FCM token error:', fcmError.message);
    }
    navigation.replace('Home');

  } catch (e) {
    console.log('[Google sign-in error]', e?.message, e);
    console.log('status:', e?.response?.status);
    console.log('data:', e?.response?.data);
    setError(
      e?.message?.includes('idToken') || e?.message?.includes('accessToken')
        ? 'Google sign-in failed to retrieve a token. Check Web client ID & SHA keys.'
        : 'Google sign-in failed. Please try again.'
    );
  } finally {
    setGLoading(false);
  }
};


  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }} edges={['top','left','right']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      {/* animated-feel gradient header */}
      <LinearGradient
        colors={['#FFEEEE', '#FFD6D6', '#EF3A3A']}
        start={{x:0.1,y:0}}
        end={{x:1,y:1}}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
      </LinearGradient>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex:1 }}
      >
        {/* glass card */}
        <View style={styles.cardWrap}>
          <View style={styles.card}>
            <View style={styles.brandPill}>
          <Image source={require('../assets/images/kni-logo.png')} style={styles.logoSmall}/>
        </View>
            <Text style={styles.title}>Restaurant Owner Login</Text>
            {/* email */}
            <View style={styles.inputWrap}>
              <Icon name="mail-outline" size={18} color="#9CA3AF" />
              <TextInput
                placeholder="Email or Phone Number"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="default"
                style={styles.input}
              />
            </View>
            {/* password */}
            <View style={styles.inputWrap}>
              <Icon name="lock-closed-outline" size={18} color="#9CA3AF" />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secure}
                style={styles.input}
              />
              <TouchableOpacity onPress={()=>setSecure(s=>!s)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
                <Icon name={secure ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            {/* subtle error (no default alert) */}
            {!!error && <Text style={styles.error}>{error}</Text>}
            {/* primary CTA */}
           <TouchableOpacity style={[styles.primaryBtn, {opacity: pLoading ? 0.7 : 1}]} onPress={handleLogin} disabled={pLoading || gLoading}>
              {pLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Login</Text>}
            </TouchableOpacity>
            {/* divider */}
            <View style={styles.dividerRow}>
              <View className="divider" style={styles.divider} />
              <Text style={styles.dividerTxt}>or continue with</Text>
              <View className="divider" style={styles.divider} />
            </View>
            {/* Google button */}
          <TouchableOpacity style={[styles.googleBtn, {opacity: gLoading ? 0.7 : 1}]} onPress={handleGoogle} disabled={gLoading || pLoading}>
              <View style={styles.googleIcon}>
                {gLoading ? <ActivityIndicator /> : <Icon name="logo-google" size={18} color="#4285F4" />}
              </View>
              <Text style={styles.googleTxt}>Sign in with Google</Text>
            </TouchableOpacity>
            {/* secondary row */}
            <View style={styles.bottomRow}>
              <TouchableOpacity onPress={()=>navigation.navigate('RestaurantRegister')}>
                <Text style={styles.linkRed}>Create an account</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={()=>navigation.navigate('RestaurantOnboarding')}>
                <Text style={styles.linkMuted}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {/* terms */}
        <View style={[styles.terms, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.termsTxt}>
            By continuing you agree to our <Text style={styles.linkMuted}>Terms</Text> & <Text style={styles.linkMuted}>Privacy</Text>.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  header:{
    height: 140,
    justifyContent:'flex-end',
    paddingHorizontal:16,
  },
  brandPill:{
    width:'80%',
    zIndex:10,
    height:60,
    justifyContent:'center',
    alignSelf:'center',
    alignItems:'center',
  },
  logoSmall:{ width:120, height:120, resizeMode:'contain' },
  cardWrap:{ flex:1, alignItems:'center', marginTop:-28 },
  card:{
    width:'90%',
    backgroundColor:'rgba(255,255,255,0.9)',
    borderRadius:20,
    borderWidth:1, borderColor:'#EEF2F7',
    padding:18,
    shadowColor:'#000', shadowOpacity:0.08, shadowRadius:18, elevation:6,
  },
  title:{ fontSize:22, fontWeight:'900', color:'#1D2254', textAlign:'center',marginTop:16, marginBottom:14 },
  inputWrap:{
    flexDirection:'row', alignItems:'center',
    backgroundColor:'#fff',
    borderWidth:1, borderColor:'#E5E7EB',
    borderRadius:14,
    paddingHorizontal:12, paddingVertical:12,
    marginBottom:12,
  },
  input:{ flex:1, marginLeft:10, color:'#0F172A' },
  error:{ color:'#DC2626', fontWeight:'700', marginBottom:8, textAlign:'center' },
  primaryBtn:{
    backgroundColor:'#EF3A3A',
    borderRadius:14, paddingVertical:14,
    alignItems:'center', marginTop:2,
    shadowColor:'#EF3A3A', shadowOpacity:0.35, shadowRadius:10, elevation:4,
  },
  primaryTxt:{ color:'#fff', fontWeight:'900', letterSpacing:0.2 },
  dividerRow:{ flexDirection:'row', alignItems:'center', marginVertical:14 },
  divider:{ flex:1, height:1, backgroundColor:'#E5E7EB' },
  dividerTxt:{ marginHorizontal:8, color:'#6B7280', fontWeight:'700' },
  googleBtn:{
    flexDirection:'row', alignItems:'center', justifyContent:'center',
    backgroundColor:'#fff',
    borderRadius:14, borderWidth:1, borderColor:'#E5E7EB',
    paddingVertical:12,
  },
  googleIcon:{
    width:28, height:28, borderRadius:8, backgroundColor:'#F1F5FF',
    alignItems:'center', justifyContent:'center', marginRight:8,
  },
  googleTxt:{ color:'#1D2254', fontWeight:'800' },
  bottomRow:{ marginTop:14, flexDirection:'row', justifyContent:'space-between' },
  linkRed:{ color:'#EF3A3A', fontWeight:'800' },
  linkMuted:{ color:'#6B7280', fontWeight:'700' },
  terms:{ alignItems:'center', paddingHorizontal:16, marginTop:8 },
  termsTxt:{ color:'#94A3B8', textAlign:'center' },
});