import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import axios from 'axios';
import api from '../../api';

interface Trip {
    trip_ticket_id: number;
    plate_no: string;
    remarks: string;
}

export default function TripList() {
    const [tripData, setTripData] = useState<Trip[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [itemsPerPage] = useState<number>(5); // Number of items per page

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/triplist/');
                setTripData(response.data.triplist);
                setLoading(false);
                console.log(response.data.triplist);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = tripData.slice(indexOfFirstItem, indexOfLastItem);

    const handleNextPage = () => {
        if (currentPage < Math.ceil(tripData.length / itemsPerPage)) {
            setCurrentPage(prevPage => prevPage + 1);
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
            <Text style={styles.title}>Trip List</Text>

                <FlatList
                    data={currentItems}
                    keyExtractor={item => item.trip_ticket_id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.tripItem}>
                            <Text style={styles.textOutput}>Trip ID: {item.trip_ticket_id}</Text>
                            <Text style={styles.textOutput}>Plate No: {item.plate_no}</Text>
                            <Text style={styles.textOutput}>Remarks: {item.remarks}</Text>
                        </View>
                    )}
                />

            <View style={styles.paginationButtons}>
                <Button title="Previous" onPress={handlePrevPage} disabled={currentPage === 1} />
                <Button title="Next" onPress={handleNextPage} disabled={currentPage === Math.ceil(tripData.length / itemsPerPage)} />
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
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    tripItem: {
        padding: 10,
        marginVertical: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 15,
        width: 300,
    },
    textOutput: {
        fontSize: 16,
        textAlign: 'center',
    },
    paginationButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 20,
    },
});

