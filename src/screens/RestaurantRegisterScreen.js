// import React, { useState } from 'react';
// import {
//   View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView
// } from 'react-native';
// import Icon from 'react-native-vector-icons/Ionicons';

// const RestaurantRegisterScreen = ({ navigation }) => {
//   const [form, setForm] = useState({
//     firstName: '',
//     lastName: '',
//     email: '',
//     phone: '',
//     password: '',
//     restaurantName: '',
//   });

//   const [secureText, setSecureText] = useState(true);

//   const handleChange = (field, value) => {
//     setForm(prev => ({ ...prev, [field]: value }));
//   };

//   const handleRegister = () => {
//     const { firstName, lastName, email, phone, password, restaurantName } = form;

//     if (firstName && lastName && email && phone && password && restaurantName) {
//       // TODO: Laravel API call for registration
//       navigation.navigate('RestaurantOnboarding');
//     } else {
//       alert('Please fill in all fields.');
//     }
//   };

//   return (
//     <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
//       <Image
//         source={require('../assets/images/kni-logo.png')}
//         style={styles.logo}
//       />

//       <Text style={styles.title}>Restaurant Owner Registration</Text>

//       {/* First Name */}
//       <View style={styles.inputWrapper}>
//         <Icon name="person-outline" size={20} color="#888" style={styles.icon} />
//         <TextInput
//           placeholder="First Name"
//           style={styles.input}
//           value={form.firstName}
//           placeholderTextColor="#999"
//           onChangeText={(text) => handleChange('firstName', text)}
//         />
//       </View>

//       {/* Last Name */}
//       <View style={styles.inputWrapper}>
//         <Icon name="person-outline" size={20} color="#888" style={styles.icon} />
//         <TextInput
//           placeholder="Last Name"
//           style={styles.input}
//           value={form.lastName}
//           placeholderTextColor="#999"
//           onChangeText={(text) => handleChange('lastName', text)}
//         />
//       </View>

//       {/* Email */}
//       <View style={styles.inputWrapper}>
//         <Icon name="mail-outline" size={20} color="#888" style={styles.icon} />
//         <TextInput
//           placeholder="Email"
//           keyboardType="email-address"
//           style={styles.input}
//           value={form.email}
//           placeholderTextColor="#999"
//           onChangeText={(text) => handleChange('email', text)}
//         />
//       </View>

//       {/* Phone */}
//       <View style={styles.inputWrapper}>
//         <Icon name="call-outline" size={20} color="#888" style={styles.icon} />
//         <TextInput
//           placeholder="Phone Number"
//           keyboardType="phone-pad"
//           style={styles.input}
//           value={form.phone}
//           placeholderTextColor="#999"
//           onChangeText={(text) => handleChange('phone', text)}
//         />
//       </View>

//       {/* Password */}
//       <View style={styles.inputWrapper}>
//         <Icon name="lock-closed-outline" size={20} color="#888" style={styles.icon} />
//         <TextInput
//           placeholder="Password"
//           secureTextEntry={secureText}
//           style={styles.input}
//           value={form.password}
//           placeholderTextColor="#999"
//           onChangeText={(text) => handleChange('password', text)}
//         />
//         <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
//           <Icon name={secureText ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
//         </TouchableOpacity>
//       </View>

//       {/* Restaurant Name */}
//       <View style={styles.inputWrapper}>
//         <Icon name="restaurant-outline" size={20} color="#888" style={styles.icon} />
//         <TextInput
//           placeholder="Restaurant Name"
//           style={styles.input}
//           value={form.restaurantName}
//           placeholderTextColor="#999"
//           onChangeText={(text) => handleChange('restaurantName', text)}
//         />
//       </View>

//       {/* Register Button */}
//       <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
//         <Text style={styles.registerText}>Register</Text>
//       </TouchableOpacity>

//       <Text style={styles.footerText}>
//         Already have an account?{' '}
//         <Text style={{ color: '#EF3A3A', fontWeight: '600' }} onPress={() => navigation.navigate('RestaurantLogin')}>
//           Login
//         </Text>
//       </Text>
//     </ScrollView>
//   );
// };

// export default RestaurantRegisterScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F5F7FA',
//     padding: 20,
//   },
//   logo: {
//     width: 100,
//     height: 100,
//     alignSelf: 'center',
//     resizeMode: 'contain',
//     marginBottom: 10,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#1D2254',
//     textAlign: 'center',
//     marginBottom: 25,
//   },
//   inputWrapper: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FFF',
//     borderColor: '#DDD',
//     borderWidth: 1,
//     borderRadius: 12,
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     marginBottom: 15,
//   },
//   icon: {
//     marginRight: 8,
//   },
//   input: {
//     flex: 1,
//     fontSize: 15,
//     color: '#000000',
//   },
//   eyeIcon: {
//     paddingLeft: 8,
//   },
//   registerButton: {
//     backgroundColor: '#EF3A3A',
//     paddingVertical: 14,
//     borderRadius: 12,
//     alignItems: 'center',
//     marginTop: 5,
//     shadowColor: '#EF3A3A',
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 6,
//     elevation: 3,
//   },
//   registerText: {
//     color: '#FFF',
//     fontWeight: 'bold',
//     fontSize: 16,
//   },
//   footerText: {
//     textAlign: 'center',
//     marginTop: 25,
//     color: '#666',
//     fontSize: 13,
//   },
// });
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from "../api/client";
import AsyncStorage from '@react-native-async-storage/async-storage';
const RestaurantRegisterScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    restaurantName: '',
    locations: '',
  });
  const [secureText, setSecureText] = useState(true);
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

const handleRegister = async () => {
  const { firstName, lastName, email, phone, password, restaurantName } = form;
  if (!firstName || !lastName || !email || !phone || !password || !restaurantName || !form.locations) {
    return alert('Please fill all fields');
  }
  try {
    const res = await api.post('/restaurant/register', {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      password,
      restaurant_name: restaurantName,
      locations: form.locations,
    });
    // Inspect once if unsure:
    // console.log('Register response:', JSON.stringify(res.data, null, 2));
    if (res.data?.status) {
      // Try common shapes to find the owner
      const owner = res.data?.data || res.data?.owner || res.data?.user;
      // If the backend returns the owner id, store it now
      if (owner?.id) {
        await AsyncStorage.setItem('ownerId', String(owner.id));
      }
      // If a token is returned, store + attach to axios (optional but nice)
      if (res.data?.token) {
        await AsyncStorage.setItem('ownerToken', res.data.token);
        api.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
      }
      alert(res.data.message || 'Registered successfully');
      // Prefer skipping login if we already have ownerId
      if (owner?.id) {
        navigation.replace('Home'); // straight to app
      } else {
        navigation.navigate('RestaurantLogin'); // fallback if no id returned
      }
    }
  } catch (err) {
    console.log(err.response?.data);
    alert(err.response?.data?.message || 'Something went wrong');
  }
};
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Image
        source={require('../assets/images/kni-logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>Restaurant Owner Registration</Text>
      {/* First Name */}
      <View style={styles.inputWrapper}>
        <Icon name="person-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="First Name"
          style={styles.input}
          value={form.firstName}
          placeholderTextColor="#999"
          onChangeText={(text) => handleChange('firstName', text)}
        />
      </View>
      {/* Last Name */}
      <View style={styles.inputWrapper}>
        <Icon name="person-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Last Name"
          style={styles.input}
          value={form.lastName}
          placeholderTextColor="#999"
          onChangeText={(text) => handleChange('lastName', text)}
        />
      </View>
      {/* Email */}
      <View style={styles.inputWrapper}>
        <Icon name="mail-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Email"
          keyboardType="email-address"
          style={styles.input}
          value={form.email}
          placeholderTextColor="#999"
          onChangeText={(text) => handleChange('email', text)}
        />
      </View>
      {/* Phone */}
      <View style={styles.inputWrapper}>
        <Icon name="call-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Phone Number"
          keyboardType="phone-pad"
          style={styles.input}
          value={form.phone}
          placeholderTextColor="#999"
          onChangeText={(text) => handleChange('phone', text)}
        />
      </View>
      {/* Password */}
      <View style={styles.inputWrapper}>
        <Icon name="lock-closed-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Password"
          secureTextEntry={secureText}
          style={styles.input}
          value={form.password}
          placeholderTextColor="#999"
          onChangeText={(text) => handleChange('password', text)}
        />
        <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
          <Icon name={secureText ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
        </TouchableOpacity>
      </View>
      {/* Restaurant Name */}
      <View style={styles.inputWrapper}>
        <Icon name="restaurant-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Restaurant Name"
          style={styles.input}
          value={form.restaurantName}
          placeholderTextColor="#999"
          onChangeText={(text) => handleChange('restaurantName', text)}
        />
      </View>
<View style={styles.inputWrapper}>
  <Icon name="map-outline" size={20} color="#888" style={styles.icon} />
  <TextInput
    placeholder="Number of Locations"
    placeholderTextColor="#999"
    style={styles.input}
    value={form.locations.toString()}
    keyboardType="numeric"
    onChangeText={(text) => handleChange('locations', parseInt(text))}
  />
</View>
      {/* Register Button */}
      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={styles.registerText}>Register</Text>
      </TouchableOpacity>
      <Text style={styles.footerText}>
        Already have an account?{' '}
        <Text style={{ color: '#EF3A3A', fontWeight: '600' }} onPress={() => navigation.navigate('RestaurantLogin')}>
          Login
        </Text>
      </Text>
    </ScrollView>
  );
};
export default RestaurantRegisterScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    resizeMode: 'contain',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D2254',
    textAlign: 'center',
    marginBottom: 25,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 15,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
  },
  eyeIcon: {
    paddingLeft: 8,
  },
  registerButton: {
    backgroundColor: '#EF3A3A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 5,
    shadowColor: '#EF3A3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  registerText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footerText: {
    textAlign: 'center',
    marginTop: 25,
    color: '#666',
    fontSize: 13,
  },
});
