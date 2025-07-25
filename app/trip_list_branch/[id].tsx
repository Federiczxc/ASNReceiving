import React, { useEffect, useState } from 'react';
import { View, Text, Button, TextInput, ActivityIndicator, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../../api';

interface TripBranch {
    branch_id: number;
    branch_name: string;
}

interface TripTicket {
    trip_ticket_id: number;
    trip_ticket_no: number;
    trip_ticket_date: Date;
}
export default function TripBranch() {
    const { id, trip } = useLocalSearchParams(); // Access route params
    const [tripBranch, setTripBranch] = useState<TripBranch[]>([]);
    const [tripTicket, setTripTicket] = useState<TripTicket>();
    const [loading, setLoading] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage] = useState<number>(10); // Number of items per page
    const [searchQuery, setSearchQuery] = useState<string>('');
    const router = useRouter();
    const fetchData = async () => {
        try {
            const response = await api.get('/tripbranch/', {
                params: { id }
            });
            setTripBranch(response.data);
            setLoading(false);
            setTripTicket(JSON.parse(trip as string));
            console.log("tite", response.data);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };
    useEffect(() => {


        fetchData();
    }, []);
    const filteredTrips = tripBranch.filter((trip) => {
        const lowerBranch = trip.branch_name.toString().toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return lowerBranch.includes(query);
    });

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
            <Text style={styles.title}>Trip Ticket #{tripTicket?.trip_ticket_no}</Text>
            <TextInput
                style={styles.searchBar}
                placeholder="Search by Branch Name"
                value={searchQuery}
                onChangeText={(text) => {
                    setSearchQuery(text);
                    setCurrentPage(1); // Reset to first page on new search
                }}
            />
            <FlatList
                data={currentItems}
                numColumns={1}
                onRefresh={fetchData}
                refreshing={loading}
                horizontal={false}
                contentContainerStyle={{ alignItems: "stretch" }}
                style={{ width: "100%" }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() =>
                            router.push({
                                pathname: '/trip_list_details/[id]',
                                params: {
                                    trip_ticket_id: id,
                                    id: item.branch_id, 
                                },
                            })
                        }
                    >
                        <View style={styles.ticketContainer}>
                            <View style={styles.ticketHeader}>
                                <Text style={styles.tripId}> Branch #{item.branch_id}</Text>
                            </View>
                            <View style={styles.ticketBody}>

                                <View style={styles.infoSection}>
                                    <Text style={styles.label}>Branch Name</Text>
                                    <Text style={styles.value}>{item.branch_name}</Text>
                                </View>
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
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'ffd33d'
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
