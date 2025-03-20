import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
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
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const accessToken = await AsyncStorage.getItem('access_token');
                const accessUser = await AsyncStorage.getItem("user_data");

                console.log('Access Token:', accessToken);

                const response = await api.get('/profile/', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                setUserData(response.data);
                console.log("niono", accessToken, accessUser);
                if (!accessToken || !accessUser) {
                    Alert.alert('Error', 'No access token found. Please log in');
                    router.push('/');
                    return;
                }
                console.log("propro", response.data);
            } catch (error) {
                console.error('Error fetching user data:', error);
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
                    <Text style={styles.empNo}>User ID: {userData.user_id}</Text>
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={async () => {
                            try {
                                await AsyncStorage.removeItem('access_token');
                                await AsyncStorage.removeItem('user_data');
                                setUserData(null); // Clear user state
                                router.push('/'); // Redirect to the login page
                            } catch (error) {
                                console.error('Error during logout:', error);
                            }
                        }}
                    >
                        <Text style={styles.logoutText}>
                            Logout
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <Text style={styles.errorText}>No user data available.</Text>
            )}
            <View style={styles.ticketContainer}>
                <TouchableOpacity onPress={() => router.push('/manage_upload/manage_upload')} activeOpacity={0.7}>
                    <View style={styles.ticketHeader}>
                        <Text style={styles.tripId}>Manage ASN Uploads</Text>
                    </View>
                </TouchableOpacity>
            </View>
            <View style={styles.ticketContainer}>
                <TouchableOpacity onPress={() => router.push('/manage_attendance/manage_attendance')} activeOpacity={0.7}>
                    <View style={styles.ticketHeader}>
                        <Text style={styles.tripId}>Manage Attendance</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>

    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f4f6f9',
    },

    ticketContainer: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 10,
        marginBottom: 0,
        marginTop: 20,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    ticketHeader: {
        backgroundColor: '#4caf50',
        padding: 20,
    },
    tripId: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },

    profileCard: {
        width: '100%',
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
    logoutButton: {
        borderRadius: 5,
        marginTop: 15,
        borderWidth: 1,
        backgroundColor: '#fff',
        width: '45%',
        alignItems: 'center',
        justifyContent: 'center'
    },
    logoutText: {
        fontSize: 16,
        textAlign: 'center',
        alignItems: 'center',
        justifyContent: 'center'
    }
});