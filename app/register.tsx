import { Text, Alert, View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { Link, Slot } from 'expo-router';
import React, { useState } from "react";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

export default function LoginPage() {
    const [values, setValues] = useState({
        username: '',
        password: '',
    })
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async () => {
        if(!values.username || !values.password){
            Alert.alert('Error', 'All fields are required.');
            return;
        }

        if (values.password != confirmPassword){
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        try {
            setIsLoading(true);
            const response = await api.post('/register/', values)
            Alert.alert('Success');
        }
        catch (error) {
            console.error(error);
            Alert.alert('tite');
        }
        finally {
            setIsLoading(false);
        }
    };
    
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Register</Text>
            <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#aaa"
                value={values.username}
                onChangeText={(text) => setValues({...values, username:text})}

            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#aaa"
                secureTextEntry
                value={values.password}
                onChangeText={(text) => setValues({...values, password:text})}

            />
            <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#aaa"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
            />
            <TouchableOpacity style={styles.button} onPress={handleRegister}>
                <Text style={styles.buttonText}>
                    {isLoading ? 'Logging in...' : 'Login'}
                </Text>
            </TouchableOpacity>
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
