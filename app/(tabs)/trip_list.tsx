import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import axios from 'axios';
import api from '../../api';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
interface Trip {
    trip_ticket_id: number;
    trip_ticket_no: number;
    plate_no: string;
    remarks: string;
    entity_name: string;
    asst_entity_name: string;
    dispatcher: string;
    trip_ticket_date: Date;
}

export default function TripList() {
    const [tripData, setTripData] = useState<Trip[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage] = useState<number>(10); // Number of items per page
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isRefreshing, setIsRefreshing] = useState<boolean>(true);
    const fetchData = async () => {
        try {
            const response = await api.get('/triplist/');
            setTripData(response.data.triplist);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };
    const router = useRouter();
    useEffect(() => {


        fetchData();
    }, []);

    const filteredTrips = tripData.filter((trip) =>
        trip.trip_ticket_no.toString().includes(searchQuery));

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
            <View style={styles.header}>
                <Text style={styles.title}>Trip Ticket List</Text>
                <TextInput
                    style={styles.searchBar}
                    placeholder="Search by Trip Ticket #"
                    keyboardType="numeric"
                    value={searchQuery}
                    onChangeText={(text) => {
                        setSearchQuery(text);
                        setCurrentPage(1); // Reset to first page on new search
                    }}
                />
            </View>

            <FlatList
                data={currentItems}
                onRefresh={fetchData}
                refreshing={loading}
                keyExtractor={item => item.trip_ticket_id.toString()}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() =>
                            router.push({
                                pathname: '/trip_list_branch/[id]',
                                params: { id: item.trip_ticket_id, trip: JSON.stringify(item) },
                            })
                        }
                    >
                        <View style={styles.ticketContainer}>
                            <View style={styles.ticketHeader}>
                                <Text style={styles.tripId}>Trip Ticket #{item.trip_ticket_no} </Text>
                                <Text style={styles.footerText} >{format(new Date(item.trip_ticket_date), 'MMM dd, yyyy')}</Text>

                            </View>
                            <View style={styles.ticketBody}>
                                <View style={styles.infoSection}>
                                    <Text style={styles.label}>Plate No:</Text>
                                    <Text style={styles.value}>{item.plate_no}</Text>
                                </View>
                                <View style={styles.infoSection}>
                                    <Text style={styles.label}>Driver:</Text>
                                    <Text style={styles.value}>{item.entity_name}</Text>
                                </View>
                                <View style={styles.infoSection}>
                                    <Text style={styles.label}>Asst. Driver:</Text>
                                    <Text style={styles.value}>{item.asst_entity_name}</Text>
                                </View>
                                <View style={styles.infoSection}>
                                    <Text style={styles.label}>Dispatched by:</Text>
                                    <Text style={styles.value}>{item.dispatcher}</Text>
                                </View>
                            </View>
                            <View style={styles.ticketFooter}>
                                <Text style={styles.footerText} >Remarks: {item.remarks}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
            />
            <View style={styles.paginationContainer}>
                <TouchableOpacity style={[
                    styles.paginationButtons,
                    currentPage === 1 && styles.disabledButton
                ]} onPress={handlePrevPage} disabled={currentPage === 1} >
                    <Text style={styles.paginationText}>
                        PREVIOUS
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.paginationButtons, currentPage === Math.ceil(filteredTrips.length / itemsPerPage) && styles.disabledButton]} onPress={handleNextPage}>
                    <Text style={styles.paginationText}>
                        NEXT
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        /*  backgroundColor: '#ffd33d' */
    },
    header: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
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
        fontSize: 13.5,
        color: '#000',
        marginTop: 3,
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
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,

    },
    disabledButton: {
        backgroundColor: '#cccccc',
        opacity: 0.6,
    },
    paginationButtons: {
        padding: 8,
        backgroundColor: '#2196F3'
    },
    paginationText: {
        color: '#fff',
        fontWeight: 500,
    }
});
