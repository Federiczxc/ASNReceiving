import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import axios from 'axios';
import api from '../../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { LogBox } from 'react-native';
import { Float } from 'react-native/Libraries/Types/CodegenTypes';
import { VELOCITY_EPS } from 'react-native-reanimated/lib/typescript/animation/decay/utils';

interface Attendance {
    log_id: number;
    trip_ticket_id: number;
    branch_id: string;
    time_in: number;
    time_out: string;
    location_in: string;
    location_out: string;
    ip_address_in: string;
    ip_address_out: string;
    latitude_in: Float;
    latitude_out: Float;
    longitude_in: Float;
    longitude_out: Float;
    branch_details: any;
}

export default function ManageAttendance() {
    const [attendanceData, setAttendanceData] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage] = useState<number>(10); // Number of items per page
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [hasMore, setHasMore] = useState<boolean>(true);
    const myRefs = React.useRef([])
    const router = useRouter();
    LogBox.ignoreLogs(["Each child in a list should have a unique key"]);
    useEffect(() => {
        const fetchData = async () => {
            try {
                const accessToken = await AsyncStorage.getItem('access_token');
                if (!accessToken) {
                    Alert.alert('Error', 'No access token found. Please log in.');
                    router.push('/');

                    return;
                }
                const response = await api.get('/manage-attendance/',
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );
                if (response.status === 200 && response.data.userlogs.length > 0) {
                    setAttendanceData(response.data.userlogs);
                    console.log("tite", response.data.userlogs);
                    console.log("atat", JSON.stringify(response.data.userlogs, null, 2));
                }
                else {
                    setAttendanceData([]);
                    console.log("titelse", response.data);

                }
            } catch (error: any) {
                console.error(error);
                if (error.response?.status === 404) {
                    setAttendanceData([]);

                }
                if (error.response?.status === 401) {
                    Alert.alert('Error', 'Your login session has expired. Please log in');
                    router.replace('/');
                    return;
                }
            }
            finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);



    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;



    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>

            {loading ? (
                <View style={styles.container}>
                    <Text>Loading...</Text>
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            ) : attendanceData.length === 0 ? (
                <Text style={styles.errorText}> No attendance data. </Text>
            ) : (
                <>
                    <Text style={styles.title}> Attendance List </Text>
                    <FlatList
                        data={attendanceData}
                        keyExtractor={item => item.log_id.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.ticketContainer}>
                                <View style={styles.ticketHeader}>
                                    <Text style={styles.tripId}> Log ID: {item.log_id} </Text>
                                    <Text style={styles.footerText}> Trip Ticket ID: {item.trip_ticket_id} </Text>
                                    <Text style={styles.footerText}> Branch : {item.branch_details.branch_name} </Text>
                                </View>
                                <View style={styles.ticketBody}>
                                    <View style={styles.infoSection}>
                                        <Text style={styles.label}> Time in: </Text>
                                        <Text style={styles.value}> {format(new Date(item.time_in), 'MMM dd, yyyy hh:mm a')}</Text>
                                    </View>
                                    <View style={styles.infoSection}>
                                        <Text style={styles.label}> Time out: </Text>
                                        <Text style={styles.value}> {item.time_out ? format(new Date(item.time_out), 'MMM dd, yyyy hh:mm a') : ''}</Text>
                                    </View>

                                </View>
                                <View style={styles.ticketFooter}>
                                    <Text style={styles.footerText}> Location Logged : {item.location_in} </Text>
                                </View>

                            </View>
                        )}
                    >
                    </FlatList>
                </>
            )}

        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'ffd33d'
    },
    errorText: {
        fontSize: 16,
        color: 'red',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    searchBar: {
        height: 40,
        width: '100%',
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 10,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
    },
    ticketContainer: {
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 15,
        marginVertical: 35,
        overflow: 'hidden',
        width: 320,
        backgroundColor: '#fff',
        elevation: 3, // For a shadow effect
    },
    ticketHeader: {
        backgroundColor: '#4caf50',
        padding: 10,
    },
    tripId: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    ticketBody: {
    },
    infoSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderWidth: 0.5,
        padding: 10
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#555',
    },
    value: {
        fontSize: 16,
        color: '#000',
    },
    ticketFooter: {
        backgroundColor: '#4caf50',
        padding: 10,
    },
    footerText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: 500,
        textAlign: 'center',
    },
    paginationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
    },
});
