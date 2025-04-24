
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Button, Alert, LogBox, ActivityIndicator, BackHandler, Modal, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import api from '../../api';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { format, secondsToMilliseconds, set } from 'date-fns';
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import * as Location from 'expo-location'
interface Item {
    item_id: number;
    outslip_to_id: number;
    item_qty: number;
    item_description: string;
    barcode: string;
    remarks: string;
    uom_code: string;
}
interface TripDetails {
    trip_ticket_id: number;
    trip_ticket_detail_id: number;
    trans_name: string;
    remarks: string;
    branch_charges: number;
    document_amount: number;
    ref_trans_date: Date;
    ref_trans_id: number;
    ref_trans_no: string;
    branch_name: string;
    barcode: string;
    item_description: string;
    item_qty: number;
    detail_volume: number;
    is_posted: boolean,
    items: Item[];
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
    const [isExpanded, setIsExpanded] = useState<Record<number, boolean>>({});
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage] = useState<number>(10); // Number of items per page
    const [hasClockIn, setHasClockIn] = useState<boolean>(false);
    const [hasClockOut, setHasClockOut] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const router = useRouter();
    const params = useLocalSearchParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const trip_ticket_id = Array.isArray(params.trip_ticket_id) ? params.trip_ticket_id[0] : params.trip_ticket_id;
    const [modalVisible, setModalVisible] = useState(false);
    const [modalVisible2, setModalVisible2] = useState(false);


    const getCurrentLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Error', 'Location permission denied');
            return null;
        }
        try {
            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            console.log('Latitude', latitude);
            console.log('Longitude', longitude);
            return { latitude, longitude };
        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert('Error', 'Failed to get location');
            return null;
        }
    };

    // Convert to number if needed
    const branch_id = id ? parseInt(id as string, 10) : null;
    const tripId = trip_ticket_id ? parseInt(trip_ticket_id as string, 10) : null;

    useEffect(() => {
        const backAction = () => {
            if (loading) {
                Alert.alert('', 'Are you sure you want to go back the previous page? All unsaved changes will be lost', [
                    {
                        text: 'Cancel',
                        onPress: () => null,
                        style: 'cancel',
                    },
                    {
                        text: 'Yes',
                        onPress: () => router.back(),

                    }
                ])
                return true;
            };

        }
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction,
        );

        return () => backHandler.remove();
    }, [loading ]);
    useFocusEffect(
        useCallback(() => {
            const fetchData = async () => {
                try {
                    const accessToken = await AsyncStorage.getItem('access_token');
                    const response = await api.get('/tripdetails/', {
                        params: { trip_ticket_id, branch_id }
                    });
                    setTripDetails(response.data.tripdetails);
                    console.log("tite", response.data.tripdetails);
                    setBranchDetails(response.data.branches[0]);
                    const timeInCheck = await api.get('/check-clock-in/', {
                        params: {
                            trip_ticket_id: trip_ticket_id,
                            branch_id: branch_id,
                        },
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            'Authorization': `Bearer ${accessToken}`,
                        },
                    })
                    const hasClockedIn = timeInCheck.data.has_clocked_in || false;
                    const hasClockedOut = timeInCheck.data.has_clocked_out
                    console.log('atta', hasClockedIn)
                    setHasClockIn(hasClockedIn)
                    setHasClockOut(hasClockedOut)
                    setLoading(false);
                } catch (error) {
                    console.error(error);
                    setLoading(false);
                }
            };
            fetchData();
        }, [trip_ticket_id, branch_id])
    );
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
            setLoading(true)
            const userData = await AsyncStorage.getItem('user_data');
            const userId = userData ? JSON.parse(userData).user_id : null;
            // Get the user's current location
            const location = await getCurrentLocation();
            if (!location) {
                Alert.alert('Error', 'Failed to get location');
                return;
            }
            const { latitude, longitude } = location;
            console.log("TUITEUTEITIE", location, latitude, longitude);
            const accessToken = await AsyncStorage.getItem('access_token');
            // Get additional location data (e.g., address) using LocationIQ or another service
            const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const currentTime = new Date().toISOString().slice(11, 19).replace('T', ' ');
            console.log("titest2 ", currentDate);
            console.log("titesmet2 ", currentTime);
            console.log("tripticketinin", trip_ticket_id, id);
            const clockInData = {
                latitude_in: latitude,
                longitude_in: longitude,
                created_by: userId,
                trip_ticket_id: trip_ticket_id,
                branch_id: id,
            };
            const postResponse = await api.post("/clock-in/", clockInData, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            console.log("clockindata", postResponse.data);
            setHasClockIn(true);
            Alert.alert("Attendance!", "You have successfully clocked in today");
        } catch (error: any) {

            if (error.response.status == 401) {
                Alert.alert('Error', 'Your login session has expired. Please log in');
                router.replace('/');
                return;
            }
            else {
                console.error("Error fetching location or clocking out:", error.response.data);
                Alert.alert("Error", JSON.stringify(error.response.data.error || error.response.data.detail));
            }

        }
        finally {
            setLoading(false)
        }
    };
    const timeOut = async () => {
        try {
            setLoading(true)
            const accessToken = await AsyncStorage.getItem('access_token');
            const userData = await AsyncStorage.getItem('user_data');
            const userId = userData ? JSON.parse(userData).user_id : null;
            const location = await getCurrentLocation();
            if (!location) {
                Alert.alert('Error', 'Failed to get location');
                return;
            }
            const { latitude, longitude } = location;
            console.log("TUITEUTEITIE", location, latitude, longitude);
            // Get additional location data (e.g., address) using LocationIQ or another service
            const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const currentTime = new Date().toISOString().slice(11, 19).replace('T', ' ');
            console.log("titest2 ", currentDate);
            console.log("titesmet2 ", currentTime);
            console.log("tripticketinin", trip_ticket_id, id);
            console.log("locloc", latitude, longitude, currentDate);
            const clockOutData = {
                latitude_out: latitude,
                longitude_out: longitude,
                trip_ticket_id: trip_ticket_id,
                branch_id: id
            }
            const postResponse = await api.post("/clock-out/", clockOutData, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            console.log("clockindata", postResponse.data)
            setHasClockOut(true);
            Alert.alert("Attendance!", "You have successfully time out!");
        } catch (error: any) {
            if (error.response.status == 401) {
                Alert.alert('Error', 'Your login session has expired. Please log in');
                router.replace('/');
                return;
            }
            else {
                console.error("Error fetching location or clocking out:", error.response.data);
                Alert.alert("Error", JSON.stringify(error.response.data.error || error.response.data.detail));
            }
        }

        finally {
            setLoading(false)
        }
    };
    /* const timeOut = async () => {
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
            Alert.alert("CLOCKEDOUT", "YOUCLOCKED");
        } catch (error: any) {
            if (error.response && error.response.data.error === "You have already clocked out today.") {
                Alert.alert("Error", "You have already clocked out today.");
            } else {
                console.error("Error fetching location or clocking out:", error.response.data);
                Alert.alert("Error", JSON.stringify(error.response.data));
            }
        }
    }; */
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
            <View style={styles.headerContainer}>
                <Text style={styles.title}>{BranchDetails?.branch_name} Outslips</Text>
                <View style={styles.clockContainer}>

                    {hasClockIn ? (
                        <View style={styles.attendanceButton}>
                            <Text>
                                Time in
                            </Text>
                            <Ionicons
                                style={styles.attendanceIcon}
                                name="checkmark-circle"
                                size={19}
                                color="#4CAF50"
                            />
                        </View>

                    ) : (
                        <TouchableOpacity onPress={() => setModalVisible(true)}>
                            <View style={styles.attendanceButton}>
                                <Text>
                                    Time in
                                </Text>
                                <Ionicons
                                    style={styles.attendanceIcon}
                                    name={"alarm-outline"}
                                    size={19} />
                            </View>
                        </TouchableOpacity>

                    )}
                    {hasClockOut ? (
                        <View style={styles.attendanceButton2}>
                            <Text>
                                Time out
                            </Text>
                            <Ionicons
                                style={styles.attendanceIcon}
                                name="checkmark-circle"
                                size={19}
                                color="#4CAF50"
                            />
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => setModalVisible2(true)}>
                            <View style={styles.attendanceButton2}>
                                <Text>
                                    Time out
                                </Text>
                                <Ionicons style={styles.attendanceIcon} name={"exit-outline"} size={19} />
                            </View>
                        </TouchableOpacity>)}
                </View>
            </View>
            <FlatList
                data={currentItems}
                numColumns={1}
                horizontal={false}
                contentContainerStyle={{ alignItems: "stretch" }}
                style={{ width: "100%" }}
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
                        disabled={item.is_posted === true}
                    >
                        <View style={styles.ticketContainer}>
                            <View style={[styles.ticketHeader, { backgroundColor: item.is_posted === true ? '#25292e' : '#4caf50' }
                            ]}>
                                <Text style={styles.tripId}>{item.trans_name} #{item.ref_trans_no}</Text>
                                <Text style={styles.tripId2}>Trip Ticket Detail #{item.trip_ticket_detail_id}</Text>
                                <Text style={styles.footerText}>{format(new Date(item.ref_trans_date), 'MMM dd, yyyy')}</Text>
                            </View>
                            {item.items && item.items.length > 0 && (
                                <View style={styles.ticketBody}>
                                    <View style={styles.infoSection}>
                                        <Text style={styles.label}>Detail Volume:</Text>
                                        <Text style={styles.value}>{item.detail_volume}</Text>
                                    </View>

                                </View>
                            )}
                            <View style={[styles.ticketFooter, { backgroundColor: item.is_posted === true ? '#25292e' : '#4caf50' }
                            ]}>
                                <Text style={styles.footerText}>Remarks: {item.remarks}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
            />
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}>
                {/* Outer container that covers entire screen */}
                <View style={styles.modalOverlay}>
                    {/* Centered content container */}
                    <View style={styles.modalContent}>
                        <Text style={styles.modalText}>
                            Please make sure you are in this branch before timing in. Press confirm to proceed
                        </Text>
                        <View style={styles.modalButtonsContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                                activeOpacity={0.7}>
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={() => {
                                    setModalVisible(false);
                                    timeIn();
                                }}
                                activeOpacity={0.7}>
                                <Text style={styles.modalButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible2}
                onRequestClose={() => setModalVisible2(false)}>
                {/* Outer container that covers entire screen */}
                <View style={styles.modalOverlay}>
                    {/* Centered content container */}
                    <View style={styles.modalContent}>
                        <Text style={styles.modalText}>
                            Please make sure you're finished uploading all the outslips before timing out
                        </Text>
                        <View style={styles.modalButtonsContainer}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible2(false)}
                                activeOpacity={0.7}>
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={() => {
                                    setModalVisible2(false);
                                    timeOut();
                                }}
                                activeOpacity={0.7}>
                                <Text style={styles.modalButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <View style={styles.paginationButtons}>
                <Button title="Previous" onPress={handlePrevPage} disabled={currentPage === 1} />
                <Button title="Next" onPress={handleNextPage} disabled={currentPage === Math.ceil(filteredTrips.length / itemsPerPage)} />
            </View>
        </View>
    );
}
const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalText: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    modalButton: {
        borderRadius: 10,
        padding: 10,
        minWidth: 100,
        alignItems: 'center',
    },
    modalButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    attendanceButton: {
        borderWidth: 1.5,
        flexDirection: 'row',
        borderRadius: 10,
        padding: 10,
        marginHorizontal: 10,
        borderColor: 'green',
        marginBottom: 5,
    },
    cancelButton: {
        backgroundColor: '#ccc',
    },
    confirmButton: {
        backgroundColor: '#4CAF50',
    },
    attendanceButton2: {
        borderWidth: 1.5,
        borderRadius: 10,
        padding: 10,
        marginHorizontal: 5,
        borderColor: 'red',
        marginBottom: 5,
        flexDirection: 'row',

    },
    attendanceIcon: {
        marginLeft: 5,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'ffd33d',
    },
    clockContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        width: '100%',
        alignContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
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
        width: '100%',
        minWidth: '100%',
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
    tripId2: {
        fontSize: 16,
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
        padding: 10,
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
    expandedItems: {
        backgroundColor: '#ffd33d'
    },
    expandedLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    expandedValue: {
        fontSize: 14,
        color: '#000',
    },
    expandedRemarks: {
        fontSize: 14,
        color: '#000',
        fontWeight: 500,
        textAlign: 'center',
    },
    expandedFooter: {
        backgroundColor: '#ffd33d',
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
    table: {
    },
    tableHeader: {
        flexDirection: 'row',
    },
    headerLabel: {
        fontWeight: 'bold',
    },
    tableBody: {
        flexDirection: 'row',
        padding: 5,
        borderWidth: 0.5,
    },
    bodyLabel: {
        fontSize: 10
    },
    bodyColumn1: {
        width: '100%',
        alignContent: 'center',
        alignSelf: 'center',
    },
    bodyColumn2: {
        width: '45%',
    },
    bodyColumn3: {
        width: '10%',
    },
    bodyColumn4: {
        width: '10%',
        marginLeft: 20
    },
    uploadPrompt: {
        color: '#ffa500',
        fontSize: 14,
        marginLeft: 5,
        fontStyle: 'italic',
    }
});
