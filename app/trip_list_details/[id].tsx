import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, LogBox, TextInput, ActivityIndicator, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '../../api';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import Ionicons from "@expo/vector-icons/Ionicons";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TripDetails {
    trip_ticket_id: number;
    trip_ticket_detail_id: number;
    trans_name: string;
    remarks: string;
    branch_charges: number;
    document_amount: number;
    ref_trans_date: Date;
    branch_name: string;
}

interface BranchDetails {
    branch_id: number;
    branch_name: string;
}

export default function TripListDetails() {

    LogBox.ignoreAllLogs()
    const [TripDetails, setTripDetails] = useState<TripDetails[]>([]);
    const [BranchDetails, setBranchDetails] = useState<BranchDetails | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage] = useState<number>(10); // Number of items per page
    const [searchQuery, setSearchQuery] = useState<string>('');
    const router = useRouter();
    const params = useLocalSearchParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const trip_ticket_id = Array.isArray(params.trip_ticket_id) ? params.trip_ticket_id[0] : params.trip_ticket_id;

    // Convert to number if needed
    const branch_id = id ? parseInt(id as string, 10) : null;
    const tripId = trip_ticket_id ? parseInt(trip_ticket_id as string, 10) : null;
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/tripdetails/', {
                    params: { trip_ticket_id, branch_id }
                });
                setTripDetails(response.data.tripdetails);
                console.log(response.data.tripdetails);
                setBranchDetails(response.data.branches[0]);
                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);
    const filteredTrips = TripDetails.filter((trip) =>
        trip.trip_ticket_id.toString().includes(searchQuery));
    console.log("tritri", trip_ticket_id, branch_id);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredTrips.slice(indexOfFirstItem, indexOfLastItem);

    const handleNextPage = () => {
        if (currentPage < Math.ceil(filteredTrips.length / itemsPerPage)) {
            setCurrentPage((prevPage) => prevPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prevPage => prevPage - 1);
        }
    };
    const timeIn = async () => {
        try {
            const userData = await AsyncStorage.getItem('user_data');
            const userId = userData ? JSON.parse(userData).user_id : null;
            const response = await api.get("/retrieve-location/");
            const locationData = response.data;
            const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const currentTime = new Date().toISOString().slice(11, 19).replace('T', ' ');
            console.log("titest2 ", currentDate);
            console.log("titesmet2 ", currentTime);
            console.log("tripticketinin", trip_ticket_id, id);
            const userIp = locationData.ip;
            const latitude = locationData.latitude;
            const longitude = locationData.longitude;
            const fulladdress = locationData.fulladdress;
            console.log("locloc", userIp, latitude, longitude, fulladdress, currentDate);

            const clockInData = {
                ip_address_in: userIp,
                location_in: fulladdress,
                latitude_in: latitude,
                longitude_in: longitude,
                created_by: userId,
                trip_ticket_id: trip_ticket_id,
                branch_id: id
            }
            const postResponse = await api.post("/clock-in/", clockInData);

            console.log("clockindata", postResponse.data)
            Alert.alert("CLOCKEDIN", "YOUCLOCKED");
        } catch (error: any) {
            if (error.response && error.response.data.error === "You have already clocked in today.") {
                Alert.alert("Error", "You have already clocked in today.");
            } else {
                console.error("Error fetching location or clocking in:", error.response.data);

                Alert.alert("Error", JSON.stringify(error.response.data));
            }
        }
    };
    const timeOut = async () => {
        try {
            const accessToken = await AsyncStorage.getItem('access_token');
            const userData = await AsyncStorage.getItem('user_data');
            const userId = userData ? JSON.parse(userData).user_id : null;
            const response = await api.get("/retrieve-location/");
            const locationData = response.data;
            const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const currentTime = new Date().toISOString().slice(11, 19).replace('T', ' ');
            console.log("titest2 ", currentDate);
            console.log("titesmet2 ", currentTime);
            console.log("tripticketinin", trip_ticket_id, id);
            const userIp = locationData.ip;
            const latitude = locationData.latitude;
            const longitude = locationData.longitude;
            const fulladdress = locationData.fulladdress;
            console.log("locloc", userIp, latitude, longitude, fulladdress, currentDate);

            const clockInData = {
                ip_address_out: userIp,
                location_out: fulladdress,
                latitude_out: latitude,
                longitude_out: longitude,
                trip_ticket_id: trip_ticket_id,
                branch_id: id
            }
            const postResponse = await api.post("/clock-out/", clockInData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            console.log("clockindata", postResponse.data)
            Alert.alert("CLOCKEDIN", "YOUCLOCKED");
        } catch (error: any) {
            if (error.response && error.response.data.error === "You have already clocked out today.") {
                Alert.alert("Error", "You have already clocked out today.");
            } else {
                console.error("Error fetching location or clocking out:", error.response.data);

                Alert.alert("Error", JSON.stringify(error.response.data));
            }
        }
    };

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
            <Text style={styles.title}>{BranchDetails?.branch_name} Outslips</Text>
            <View style={styles.clockContainer}>
                <TouchableOpacity onPress={timeIn}>
                    <View style={styles.attendanceButton}>
                        <Text>
                            Clock in
                            <Ionicons name={"alarm-outline"} size={24} />
                        </Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={timeOut}>
                    <View style={styles.attendanceButton2}>
                        <Text>
                            Clock out
                            <Ionicons name={"alarm-outline"} size={24} />
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            <FlatList
                data={currentItems}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() =>
                            router.push({
                                pathname: '/outslip_upload/[id]',
                                params: {
                                    id: item.trip_ticket_detail_id,
                                },
                            })
                        }
                    >
                        <View style={styles.ticketContainer}>
                            <View style={styles.ticketHeader}>
                                <Text style={styles.tripId}>{item.trans_name} #{item.trip_ticket_detail_id}</Text>
                                <Text style={styles.footerText}>{format(new Date(item.ref_trans_date), 'MMM dd, yyyy')}</Text>
                            </View>
                            <View style={styles.ticketBody}>
                                <View style={styles.infoSection}>
                                    <Text style={styles.label}>Branch Charges:</Text>
                                    <Text style={styles.value}>{item.branch_charges}</Text>
                                </View>
                                <View style={styles.infoSection}>
                                    <Text style={styles.label}>Document Amount:</Text>
                                    <Text style={styles.value}>{item.document_amount}</Text>
                                </View>
                            </View>
                            <View style={styles.ticketFooter}>
                                <Text style={styles.footerText} >Remarks: {item.remarks}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
            />
            <View style={styles.paginationButtons}>
                <Button title="Previous" onPress={handlePrevPage} disabled={currentPage === 1} />
                <Button title="Next" onPress={handleNextPage} disabled={currentPage === Math.ceil(filteredTrips.length / itemsPerPage)} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    attendanceButton: {
        borderWidth: 1.5,
        borderRadius: 10,
        padding: 10,
        marginHorizontal: 5,
        borderColor: 'green',
    },
    attendanceButton2: {
        borderWidth: 1.5,
        borderRadius: 10,
        padding: 10,
        marginHorizontal: 5,
        borderColor: 'red',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'ffd33d'
    },
    clockContainer: {
        flexDirection: 'row',
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
        marginVertical: 20,
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
        padding: 10,
    },
    infoSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
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
