import { Text, View, StyleSheet, Image, TextInput, Alert, BackHandler, TouchableOpacity } from "react-native";
import { Notifier, Easing, NotifierComponents } from 'react-native-notifier'
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import axios from 'axios';
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';
import icon from '@/assets/images/winterpine-icon.png';
export default function LoginPage() {

  const [values, setValues] = useState({
    username: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [errorData, setErrorData] = useState(null);
  useEffect(() => {
    const backAction = () => {
      Alert.alert('', 'Are you sure you want to exit the app?', [
        {
          text: 'Cancel',
          onPress: () => null,
          style: 'cancel',
        },
        {
          text: 'YES',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('access_token');
              await AsyncStorage.removeItem('user_data');
            } catch (error) {
              console.error('Error clearing AsyncStorage:', error);
            }
            BackHandler.exitApp();
          }
        },
      ]);
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, []);
  const handleLogin = async () => {
    setIsLoading(true);

    try {
      const response = await api.post('/login/', values)
      const { access, refresh } = response.data;
      await AsyncStorage.setItem('access_token', access);
      await AsyncStorage.setItem('refresh_token', refresh);

      if (response.data.user) {
        const { user_id, username: loggedInUser } = response.data.user;
        console.log("betlog", response.data);
        await AsyncStorage.setItem('user_data', JSON.stringify({ user_id, username: loggedInUser }));
      } else {
        console.error("User data not found in the response.");
      }
      router.replace('/profile');
    }
    catch (error: any) {
      if (error.response) {
        setErrorData(error.response.data.non_field_errors)
        Notifier.showNotification({
          title: 'Error',
          description: error.response.data.non_field_errors,
          duration: 10000,
          Component: NotifierComponents.Notification,
          componentProps: {
            titleStyle: {
              color: 'red',
            }
          }
        });
      }
      else {
        Notifier.showNotification({
          title: 'Error',
          description: 'Connection failed. Please try again later',
          duration: 10000,
          Component: NotifierComponents.Notification,
          componentProps: {
            titleStyle: {
              color: 'red',
            }
          }
        });
      }
    }
    finally {
      setIsLoading(false);
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image style={styles.imageLogo} source={icon} />
      </View>
      <Text style={styles.text}>Delivery Monitoring System</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#aaa"
          value={values.username}
          onChangeText={(text) => setValues({ ...values, username: text })}

        />
        <Ionicons color='hsl(0,0%,70%)' style={styles.icon} name="person-outline" size={18} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={values.password}
          onChangeText={(text) => setValues({ ...values, password: text })}
        />
        <Ionicons color='hsl(0,0%,70%)' style={styles.icon2} name="key-outline" size={18} />

      </View>
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>
          {isLoading ? 'Logging in...' : 'Log in'}
          {/* <Ionicons color='hsl(0,0%,70%)' name="log-in-outline" size={18} /> */}
        </Text>
      </TouchableOpacity>
      {/* <Link href="/register" style={styles.link}>Register</Link> */}

      <View style={styles.version}>
        <Text style={styles.versionText}>
          v3.0.0 - TEST
        </Text>
        <Text style={styles.versionText2}>
          Updated: 5/15/25
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    borderWidth: 3,
    borderColor: 'white',
    marginBottom: 4,
  },
  errorTitle: {
    color: 'red',
  },
  text: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 20,
  },
  imageLogo: {
    height: 120,
    width: 120,
  },
  logoContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    color: '#fff',
  },
  inputContainer: {
    justifyContent: 'center',
    width: '100%',
  },
  icon: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  icon2: {
    position: 'absolute',
    right: 10,
    bottom: 30,
  },
  button: {
    backgroundColor: 'green',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  link: {
    marginTop: 20,
    color: 'green',
    textDecorationLine: 'underline',
  },
  version: {
    borderRadius: 15,
    marginTop: 15,
    backgroundColor: '#25292e',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    textAlign: 'center',
    padding: 5,
    position: 'absolute',
    bottom: 10,
  },
  versionText: {
    fontSize: 14,
    color: '#fff',

  },
  versionText2: {
    fontSize: 10,
    color: '#fff',

  }
});
