import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import axios from 'axios';
import api from '../../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { LogBox } from 'react-native';

interface TripUploads {
    trip_ticket_id: number;
    trip_ticket_no: number;
    branch_name: string;
    trip_ticket_detail_id: number;
    trans_name: string;
    ref_trans_date: Date;
    created_date: Date;
    ref_trans_id: number;
}

export default function TripList() {
    const [tripData, setTripData] = useState<TripUploads[]>([]);
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
                const response = await api.get('/manage_upload/',
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );
                if (response.status === 200 && response.data.tripdetails.length > 0) {
                    setTripData(response.data.tripdetails);
                    console.log("tite", response);
                    console.log("tripde", JSON.stringify(response.data.tripdetails, null, 2));
                }
                else {
                    setTripData([]);
                    console.log("titelse", response.data);

                }
            } catch (error: any) {
                console.error(error);
                if (error.response?.status === 404) {
                    setTripData([]);

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

    const filteredTrips = tripData.filter((trip) =>
        trip.trip_ticket_id.toString().includes(searchQuery));

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
                <>
                    <Text>Loading...</Text>
                    <ActivityIndicator size="large" color="#0000ff" />
                </>
            ) : tripData.length === 0 ? (
                <Text style={styles.errorText}>No upload data available.</Text>

            ) : (
                <>
                    <Text style={styles.title}>Upload List</Text>

                    <FlatList
                        data={currentItems}
                        renderItem={({ item }) => (

                            <View style={styles.ticketContainer}>
                                <View style={styles.ticketHeader}>
                                    {/*  <TouchableOpacity onPress={() => router.push({
                                        pathname: '/trip_list_branch/[id]',
                                        params: { id: item.trip_ticket_id, trip: JSON.stringify(item) },
                                    })}>
 */}
                                    <Text style={styles.tripId}>Trip Ticket #{item.trip_ticket_no} </Text>
                                    <Text style={styles.footerText}>Upload Date: {Array.isArray(item.trip_ticket_detail_id) && item.trip_ticket_detail_id.length > 0
                                        ? format(new Date(item.trip_ticket_detail_id[0].created_date), 'MMM dd, yyyy')
                                        : 'N/A'}</Text>
                                    {/* </TouchableOpacity> */}

                                </View>

                                {Array.isArray(item.trip_ticket_detail_id) && (
                                    <View style={styles.ticketBody}>
                                        <View style={styles.tableHeader}>
                                            <View style={{ width: '25%', paddingLeft: 3 }}>
                                                <Text style={styles.headerLabel}>Outslip #</Text>
                                            </View>
                                            <View style={{ width: '45%' }}>
                                                <Text style={styles.headerLabel}>Trip Ticket Detail #</Text>
                                            </View>
                                            <View style={{ width: '25%' }}>

                                                <Text style={styles.headerLabel}>Branch</Text>
                                            </View>
                                        </View>
                                        {item.trip_ticket_detail_id.map((detail, index) => (
                                            <TouchableOpacity key={index} onPress={() =>
                                                router.push({
                                                    pathname: '/manage_upload/[id]',
                                                    params: { id: detail.trip_ticket_detail_id },
                                                })
                                            }>

                                                <View style={styles.tableBody}>
                                                    <View style={styles.bodyColumn1}>
                                                        <Text style={styles.bodyLabel}>{detail.ref_trans_no}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.bodyColumn2}>
                                                        <Text style={styles.bodyLabel}>
                                                            {detail.trip_ticket_detail_id}
                                                        </Text>
                                                    </View>
                                                    <View style={styles.bodyColumn3}>
                                                        <Text style={styles.bodyLabel}>{detail.branch_name} </Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                                {/*  <View style={styles.ticketFooter}>
                                    <Text style={styles.footerText}>
                                        {Array.isArray(item.trip_ticket_detail_id) && item.trip_ticket_detail_id.length > 0
                                            ? item.trip_ticket_detail_id[0].trans_name
                                            : 'N/A'}
                                    </Text>
                                </View> */}


                            </View>
                        )}
                    />


                    <View style={styles.paginationButtons}>
                        <Button title="Previous" onPress={handlePrevPage} disabled={currentPage === 1} />
                        <Button title="Next" onPress={handleNextPage} disabled={currentPage === Math.ceil(filteredTrips.length / itemsPerPage)} />
                    </View>
                </>
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
        marginVertical: 20,
        overflow: 'hidden',
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
    tableHeader: {
        flexDirection: 'row',

    },
    headerLabel: {
        fontWeight: 'bold',
    },
    tableBody: {
        flexDirection: 'row',
        padding: 10,
        borderWidth: 0.5,
    },
    bodyLabel: {
        fontSize: 14
    },
    bodyColumn1: {
        width: '25%',
    },
    bodyColumn2: {
        width: '35%',
        alignItems: 'center'
    },
    bodyColumn3: {
        width: '40%',
        alignItems: 'center'

    },
});
