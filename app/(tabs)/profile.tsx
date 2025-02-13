import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api';
interface UserData {
   
    user_name: string;
    user_id: string;
}
export default function Profile() {
    const [userData, setUserData] = useState<UserData | null>(null);   // To hold the user data
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const accessToken = await AsyncStorage.getItem('access_token');

                console.log('Access Token:', accessToken);
                if (!accessToken) {
                    Alert.alert('Error', 'No access token found. Please log in');
                    return;
                }
                const response = await api.get('/profile/', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                setUserData(response.data);
                console.log("propro", response.data);
            } catch (error) {
                console.error('Error fetching user data:', error);
                Alert.alert('Error', 'Failed to fetch user data');
            } finally {
                setLoading(false);
            }

        };
        fetchUserData();
    }, []);
    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }
    return (
        <View style={styles.container}>
            {userData ? (
                <View style={styles.profileCard}>
                    <Text style={styles.greeting}>User Profile</Text>
                    <Text style={styles.name}>Username: {userData.user_name}</Text>
                    <Text style={styles.empNo}>Employee Number: {userData.user_id}</Text>
                </View>
            ) : (
                <Text style={styles.errorText}>No user data available.</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f4f6f9',
    },
    profileCard: {
        width: '90%',
        padding: 20,
        borderRadius: 20,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        alignItems: 'center',
    },
    greeting: {
        fontSize: 22,
        color: '#ffd33d',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    name: {
        fontSize: 18,
        color: '#333333',
        marginBottom: 8,
    },
    empNo: {
        fontSize: 16,
        color: '#666666',
    },
    errorText: {
        fontSize: 16,
        color: 'red',
    },
});