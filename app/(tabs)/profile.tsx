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
                const userObject = accessUser ? JSON.parse(accessUser) : null;
                const username = userObject?.username;

                console.log("niono", username);
                console.log("niono", accessToken, accessUser);

                console.log("propro", response.data);
            } catch (error: any) {
                if (error.response.status === 401) {
                    Alert.alert('Error', 'Your login session has expired. Please log in');
                    router.replace('/');
                    return;
                }
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
                        <Text style={styles.tripId}>Manage Uploads</Text>
                    </View>
                </TouchableOpacity>
            </View>
            <View style={styles.ticketContainer}>
                <TouchableOpacity onPress={() => router.push('/manage_attendance/manage_attendance')} activeOpacity={0.7}>
                    <View style={styles.ticketHeader}>
                        <Text style={styles.tripId}>View Attendance</Text>
                    </View>
                </TouchableOpacity>
            </View>
            <View style={styles.version}>
                <Text style={styles.versionText}>
                    v3.1.0 - TEST-M RET 
                </Text>
                <Text style={styles.versionText2}>
                    Updated: 5/22/25
                </Text>
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
        elevation: 3,
        alignItems: 'center',
    },
    greeting: {
        fontSize: 22,
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
    },
    version: {
        borderRadius: 15,
        marginTop: 15,
        borderWidth: 1,
        backgroundColor: '#25292e',
        color: '#fff',
        width: '45%',
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