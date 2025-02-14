import React, { useEffect, useState } from 'react';
import { View, Text, Button, Dimensions, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import api from '../../api';
import Carousel from 'react-native-reanimated-carousel';
export default function OutslipUpload() {
    const [tripBranch, setTripBranch] = useState({
        branch_name: ''
    });
    const [outslipDetail, setOutslipDetail] = useState({
        trip_ticket_id: null,
        trip_ticket_detail_id: null,
        trans_name: null,
        remarks: null,
        branch_charges: null,
        document_amount: null
    })
    const [selectedImage, setSelectedImage] = useState(null);
    const [ocrText, setOcrText] = useState('');
    const { id } = useLocalSearchParams();
    const [isExpanded, setIsExpanded] = useState(false);
    const trip_ticket_detail_id = id;
    const [images, setImages] = useState([null]);
    const [ocrResults, setOcrResults] = useState([]);
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/outslipview/', {
                    params: { trip_ticket_detail_id }
                });
                setOutslipDetail(response.data.tripdetails[0]);
                setTripBranch(response.data.branches[0]);
                console.log("out", response.data);
            } catch (error) {
                console.error(error);
            }
        };

        fetchData();
    }, []);
    console.log("brara", tripBranch);
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };
    const addNewSlide = () => {
        setImages([...images, null]); // Add a new empty slide
        setOcrResults([...ocrResults, '']);
    };

    const handleOCR = async () => {
        if (!selectedImage) {
            Alert.alert('No image selected', 'Please select an image first.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('image', {
                uri: selectedImage,
                type: 'image/jpeg',
                name: 'photo.jpg',
            });

            const response = await api.post('/ocr/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            let newOcrResults = [...ocrResults];
            newOcrResults[index] = response.data.text || 'No text detected';
            setOcrResults(newOcrResults);

        } catch (error) {
            console.error('Error during OCR processing:', error);
            Alert.alert('Error', 'Failed to process the image. Please try again.');
        }
    };

    return (

        <ScrollView contentContainerStyle={styles.scrollContainer}>

            <View style={styles.container1}>


                <View style={styles.ticketContainer}>
                    <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
                        <View style={styles.ticketHeader}>
                            <Text style={styles.tripId}>{outslipDetail.trans_name} #{outslipDetail.trip_ticket_detail_id}</Text>
                            <Text style={styles.tripId}>Branch Name: {tripBranch.branch_name}</Text>

                        </View>
                        {isExpanded && (
                            <>
                                <View style={styles.ticketBody}>
                                    <View style={styles.infoSection}>
                                        <Text style={styles.label}>Branch Charges:</Text>
                                        <Text style={styles.value}>{outslipDetail.branch_charges}</Text>
                                    </View>
                                    <View style={styles.infoSection}>
                                        <Text style={styles.label}>Document Amount:</Text>
                                        <Text style={styles.value}>{outslipDetail.document_amount}</Text>
                                    </View>
                                </View>
                                <View style={styles.ticketFooter}>
                                    <Text style={styles.footerText}>Remarks: {outslipDetail.remarks}</Text>
                                </View>
                            </>
                        )}
                    </TouchableOpacity>

                </View>
            </View>
            <View style={styles.container2}>
                <Carousel
                    loop={false}
                    width={Dimensions.get('window').width * 1}
                    height={Dimensions.get('window').height * 1}
                    data={images}
                    scrollAnimationDuration={500}
                    renderItem={({ index }) => (
                        <>

                            {/* Image Preview & OCR Result Card */}
                            <View style={styles.imageCard}>
                                <View style={styles.imageContainer}>

                                    <TouchableOpacity onPress={() => pickImage(index)} activeOpacity={0.0} style={styles.imageCard}>
                                        <Text style={styles.ocrTitle}>Picture:</Text>

                                        {images[index] ? (
                                            <>
                                                <Image source={{ uri: images[index] }} style={styles.image} />
                                            </>

                                        ) : (
                                            <Text style={styles.placeholder}>No image selected. Press to upload a picture</Text>
                                        )}
                                    </TouchableOpacity>

                                </View>

                            </View>
                            <View style={styles.card}>
                                <Text style={styles.ocrTitle}>OCR Result:</Text>
                                <TextInput
                                    style={styles.textOutput}
                                    value={ocrText || ''}
                                    onChangeText={(text) => setOcrText(text)}
                                    multiline
                                />

                            </View>
                            {/* Buttons Section */}
                            <View style={styles.buttonContainer}>
                                <Button title="Extract Text" onPress={() => handleOCR(index)} />
                                <Button title="Submit" onPress={handleOCR} />
                            </View>

                        </>
                    )} />
                <Button title="Add Picture" onPress={addNewSlide} />
            </View>
        </ScrollView >

    );
}


const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        alignItems: 'center',
        paddingBottom: 20,
    },
    container1: {
        width: Dimensions.get('window').width * 1,
        alignItems: 'center',
        backgroundColor: 'transparent',
        padding: 16,
    },
    container2: {
        width: Dimensions.get('window').width * 1,
        alignItems: 'center',
        backgroundColor: 'transparent',
        /*    borderWidth: 1,
           borderColor: '#333',
           borderRadius: 15, */
        padding: 16,
    },
    ticketContainer: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 15,
        marginVertical: 20,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 3,
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
        marginBottom: 10,
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
        textAlign: 'center',
    },
    imageContainer: {
        width: '100%',
        height: 200,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    imageCard: {
        width: '100%',
        height: 200,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        marginBottom: 20,
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
        resizeMode: 'contain',
    },
    placeholder: {
        fontSize: 14,
        color: '#666',
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    ocrTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    textOutput: {
        fontSize: 14,
        color: '#666',
        textAlign: 'left',
        width: '100%',
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        minHeight: 60,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
});