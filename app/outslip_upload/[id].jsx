
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Dimensions, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import api from '../../api';
import Carousel from 'react-native-reanimated-carousel';
import { LogBox } from 'react-native';
import { Notifier, Easing } from 'react-native-notifier';

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
    });
    LogBox.ignoreLogs(['findDOMNode is deprecated']);

    const [selectedImage, setSelectedImage] = useState(null);
    const [ocrText, setOcrText] = useState('');
    const { id } = useLocalSearchParams();
    const [isExpanded, setIsExpanded] = useState(false);
    const trip_ticket_detail_id = id;
    const [images, setImages] = useState([null]);
    const [ocrResults, setOcrResults] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [editableOcrText, setEditableOcrText] = useState(ocrText);
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
    const pickImage = async (index) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
        });
        if (!result.canceled) {
            let newImages = [...images];
            newImages[index] = result.assets[0].uri;
            setImages(newImages);
        }
    };
    const addNewSlide = () => {
        setImages([...images, null]); // Add a new empty slide
        setOcrResults([...ocrResults, '']);
        console.log("imaima", images)
        Notifier.showNotification({
            title: 'Success',
            description: 'Hello! Can you help me with notifications?',
            duration: 200,
            showAnimationDuration: 800,
        });
    };
    const handleOCR = async (index) => {
        if (!images[index]) {
            Alert.alert('No image selected', 'Please select an image first.');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('image', {
                uri: images[index],
                type: 'image/jpeg',
                name: 'photo.jpg',
            });
            const response = await api.post('/ocr/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            let newOcrResults = [...ocrResults];
            newOcrResults[index] = response.data.text || 'No text detected';
            setOcrResults(newOcrResults);
            setEditableOcrText(newOcrResults[index]);

            console.log("ocrreuslts", newOcrResults);
        } catch (error) {
            console.error('Error during OCR processing:', error);
            Alert.alert('Error', 'Failed to process the image. Please try again.');
        }
    };
    return (
        <View style={styles.container} >
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
                    height={500}
                    data={images}
                    scrollAnimationDuration={200}
                    onProgressChange={(_, absoluteProgress) => {
                        const newIndex = Math.round(absoluteProgress);
                        setCurrentIndex(newIndex);
                        setEditableOcrText(ocrResults[newIndex] || '');
                    }}
                    renderItem={({ index }) => (
                        <>
                            <View style={styles.paginationContainer}>
                                {images.map((_, i) => (
                                    <View key={i} style={[styles.dot, currentIndex === i ? styles.activeDot : null]} />
                                ))}
                            </View>
                            {/* Image Preview & OCR Result Card */}
                            <View style={styles.ocrCard}>
                                <Text style={styles.ocrTitle}>OCR Result:</Text>
                                <TextInput
                                    style={styles.textOutput}
                                    value={editableOcrText || ''}  // Use editable state
                                    onChangeText={(text) => {
                                        const newOcrResults = [...ocrResults];
                                        newOcrResults[index] = text;  // Update OCR text for the current image
                                        setOcrResults(newOcrResults);
                                        setEditableOcrText(text);  // Keep the editable text updated
                                    }}
                                    multiline
                                />
                            </View>
                            <View style={styles.imageCard}>
                                <TouchableOpacity onPress={() => pickImage(index)} activeOpacity={0.7} style={styles.imageCard}>
                                    {images[index] ? (
                                        <>
                                            <Image source={{ uri: images[index] }} style={styles.image} />
                                        </>
                                    ) : (
                                        <Text style={styles.placeholder}>No image selected. Press to upload a picture</Text>
                                    )}
                                </TouchableOpacity>
                            </View>


                            {/* Buttons Section */}
                        </>
                    )} />
            </View>
            <View style={styles.buttonContainer}>
                <Button title="Extract Text" onPress={() => handleOCR(currentIndex)} />
                <Button title="Submit" onPress={handleOCR} />
                <Button title="Add Picture" onPress={addNewSlide} />
            </View>
        </View>
    );
}
const styles = StyleSheet.create({
    container1: {
        width: '100%',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    container2: {
        width: '100%',
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
        borderRadius: 10,
        marginVertical: 20,
        overflow: 'hidden',
        backgroundColor: '#fff',
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
    imageCard: {
        width: '100%',
        height: 300,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        padding: 5
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        resizeMode: 'contain',
    },
    placeholder: {
        fontSize: 14,
        color: '#666',
    },
    ocrCard: {
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
        marginBottom: 30,
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
        paddingHorizontal: 10,
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ccc',
        marginHorizontal: 5,
    },
    activeDot: {
        backgroundColor: '#4caf50',  // Active dot color
        width: 12,
        height: 12,
    },
});
