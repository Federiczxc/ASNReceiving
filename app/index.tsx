import { Text, View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { Link, useRouter } from 'expo-router';
import React, { useState } from "react";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

export default function LoginPage() {

  const [values, setValues] = useState({
    username: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
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
      router.push('/profile');
    }
    catch (error) {
      console.error(error);
    }
    finally {
      setIsLoading(false);
    }
  };
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#25292e',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    text: {
      color: '#fff',
      fontSize: 24,
      marginBottom: 20,
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
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Delivery Monitoring System</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#aaa"
        value={values.username}
        onChangeText={(text) => setValues({ ...values, username: text })}


      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={values.password}
        onChangeText={(text) => setValues({ ...values, password: text })}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>
          {isLoading ? 'Logging in...' : 'Log in'}
        </Text>
      </TouchableOpacity>
      {/* <Link href="/register" style={styles.link}>Register</Link> */}


    </View>
  );
}
