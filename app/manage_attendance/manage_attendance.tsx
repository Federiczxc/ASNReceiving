import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import axios from 'axios';
import api from '../../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { LogBox } from 'react-native';
import { Float } from 'react-native/Libraries/Types/CodegenTypes';

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
                    return;
                }
                const response = await api.get('/manage_upload/',
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );
                if (response.status === 200 && response.data.tripdetails.length > 0) {
                    setAttendanceData(response.data.tripdetails);
                    console.log("tite", response);
                    console.log("tripde", JSON.stringify(response.data.tripdetails, null, 2));
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
            

        </View>
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
