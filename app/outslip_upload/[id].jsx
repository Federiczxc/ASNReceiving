
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Dimensions, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { BlurView } from 'expo-blur';

import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../api';

import Carousel from 'react-native-reanimated-carousel';
import { LogBox } from 'react-native';
import { Notifier, Easing } from 'react-native-notifier';
import AsyncStorage from '@react-native-async-storage/async-storage';
export default function OutslipUpload() {
    const [tripBranch, setTripBranch] = useState({
        branch_name: '',
        branch_id: '',
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

    const [isLoading, setIsLoading] = useState(true);
    const [ocrText, setOcrText] = useState('');
    const { id } = useLocalSearchParams();
    const [isExpanded, setIsExpanded] = useState(false);
    const trip_ticket_detail_id = id;
    const [images, setImages] = useState([null]);
    const [ocrResults, setOcrResults] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [editableOcrText, setEditableOcrText] = useState(ocrText);
    const [opened, setOpened] = useState(false);
    const [remarks, setRemarks] = useState([]);
    useEffect(() => {
        setIsLoading(true);
        const fetchData = async () => {
            try {
                const response = await api.get('/outslipview/', {
                    params: { trip_ticket_detail_id }
                });
                setOutslipDetail(response.data.tripdetails[0]);
                setTripBranch(response.data.branches[0]);
                console.log("out", response.data);
                setIsLoading(false);
            } catch (error) {
                console.error(error);
            }
        };
        fetchData();
    }, []);
    /* console.log("brara", tripBranch); */
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
        setRemarks([...remarks, '']);
        console.log("imaima", images)

        requestAnimationFrame(() => {
            Notifier.showNotification({
                title: 'Success',
                description: 'Added new picture!',
                duration: 3000,
            });
        });
    };

    const removeSlide = (index) => {
        if (images.length === 1) {
            Alert.alert("Cannot remove the last slide.");
            return;
        }

        let updatedImages = [...images];
        updatedImages.splice(index, 1);

        let updatedOcrResults = [...ocrResults];
        updatedOcrResults.splice(index, 1);

        let updatedRemarks = [...remarks];
        updatedRemarks.splice(index, 1);

        setImages(updatedImages);
        setOcrResults(updatedOcrResults);
        setRemarks(updatedRemarks);

        // Adjust the currentIndex to point to a valid slide
        let newIndex = currentIndex;
        if (currentIndex === index) {
            // If the removed slide was the current one, move to the previous slide
            newIndex = Math.max(0, index - 1);
        } else if (currentIndex > index) {
            // If the removed slide was before the current one, adjust the currentIndex
            newIndex = currentIndex - 1;
        }

        setCurrentIndex(newIndex);

        requestAnimationFrame(() => {
            Notifier.showNotification({
                title: 'Success',
                description: 'Slide removed!',
                duration: 3000,
            });
        });
    };
    const handleOCR = async (index) => {
        setIsLoading(true);

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
            console.log("formdaa", formData);
            console.log("ocrreuslts", newOcrResults);
        } catch (error) {
            console.error('Error during OCR processing:', error);
            Alert.alert('Error', 'Failed to process the image. Please try again.');
        }
        finally{
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        const accessToken = await AsyncStorage.getItem('access_token');
        const userData = await AsyncStorage.getItem('user_data');
        const userId = userData ? JSON.parse(userData).user_id : null;

        console.log('acotot', userId);
        try {
            const formData = new FormData();
            images.forEach((imageUri, index) => {
                if (imageUri) {
                    const imageType = imageUri.split('.').pop();  // Get the file extension
                    const mimeType = `image/${imageType}`;  // Create the MIME type

                    formData.append('image', {
                        uri: imageUri,
                        type: mimeType,  // Use the dynamic MIME type
                        name: `photo_${index}.${imageType}`,  // Use the correct file extension
                    });
                }
            });
            formData.append('trip_ticket_detail_id', trip_ticket_detail_id.toString());
            formData.append('trip_ticket_id', outslipDetail.trip_ticket_id.toString());
            const createdDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            formData.append('created_date', createdDate);
            formData.append('created_by', userId);
            formData.append('branch_id', tripBranch.branch_id)
            if (Array.isArray(ocrResults)) {
                ocrResults.forEach((ocrResult) => {
                    formData.append('upload_text', ocrResult);
                });
            } else {
                formData.append('upload_remarks', '');
            }
            console
            if (Array.isArray(remarks)) {
                remarks.forEach((remark) => {
                    formData.append('upload_remarks', remark);
                });
            } else {
                formData.append('upload_remarks', '');
            }
            console.log("paso", formData);
            const response = await api.post('/outslipupload/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    /* 'Authorization': `Bearer ${accessToken}`, */
                },
            });
            Notifier.showNotification({
                title: 'Success',
                description: 'Outslip uploaded successfully',
                duration: 3000,
            });
            router.push('/manage_upload/manage_upload')
            console.log('succ', response.data);
        }
        catch (error) {
            console.error('Error:', error);

            if (error.response) {
                console.log('Response Data:', error.response.data);
                console.log('Response Status:', error.response.status);
                console.log('Response Headers:', error.response.headers);

                const details = error.response.data.details || [];
                let errorMessage = 'Upload failed:\n';

                details.forEach(detail => {
                    const errors = detail.errors || {};
                    errorMessage += `${detail.upload_image}: ${JSON.stringify(errors)}\n`;
                });

                Alert.alert('Upload Failed', JSON.stringify(error.response.data));
            } else {
                Alert.alert('Upload Failed', 'An unexpected error occurred.');
            }
        }
        finally {
            setIsLoading(false);
        }
    };


    return (

        <ScrollView style={styles.container} >
            {isLoading && (
                <BlurView intensity={400} style={styles.overlayLoading} >
                    <ActivityIndicator size="large" color="#4CAF50" />
                </BlurView>
            )}
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
                    key={images.length}
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
                                <Text style={styles.ocrTitle}>Remarks:</Text>
                                <TextInput
                                    style={styles.textOutput}
                                    value={remarks[currentIndex] || ''}
                                    onChangeText={(text) => {
                                        let newRemarks = [...remarks];
                                        newRemarks[currentIndex] = text;
                                        setRemarks(newRemarks)
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
                            <View style={styles.paginationContainer}>
                                {images.map((_, i) => (
                                    <View key={i} style={[styles.dot, currentIndex === i ? styles.activeDot : null]} />
                                ))}
                            </View>

                            {/* Buttons Section */}
                        </>
                    )} />
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={() => handleOCR(currentIndex)}>
                    <Text style={styles.buttonText}>Extract Text</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                    <Text style={styles.buttonText} >Submit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={addNewSlide}>
                    <Text style={styles.buttonText}>Add Picture</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={() => removeSlide(currentIndex)}>
                    <Text style={styles.buttonText}>Remove Slide</Text>
                </TouchableOpacity>
            </View>


        </ScrollView>
    );
}
const styles = StyleSheet.create({

    activeDot: {
        backgroundColor: '#4caf50',  // Active dot color
        width: 12,
        height: 12,
    },

    button: {
        width: '48%',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        marginVertical: 5,
        height: '45%',
        backgroundColor: '#2986cc',  // Active dot color


    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        flexWrap: 'wrap',
        flex: 1,
        paddingHorizontal: 10,
        
    },
    buttonText: {
        color: '#fff',

    },
    container: {
        flex: 1,
    },
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
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ccc',
        marginHorizontal: 5,
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
    footerText: {
        fontSize: 14,
        color: '#fff',
        textAlign: 'center',
    },
    imageCard: {
        width: '100%',
        height: 250,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        padding: 5,
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        resizeMode: 'contain',
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
        marginBottom: 20,
        position: 'relative',
    },
    overlayLoading: {
        position: 'absolute', // Ensures it overlays ocrCard
        top: 0,
        left: 0,
        right: 0,
        bottom: -5,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 0, // Matches ocrCard's border
        backgroundColor: 'rgba(0, 0, 0, 0.3)', // Softer overlay

        zIndex: 10, // Ensure it appears on top
    },
    ocrTitle: {
        fontSize: 16,
        fontWeight: 'bold',
/*         marginBottom: 10,
 */        color: '#333',
    },

    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10
    },
    placeholder: {
        fontSize: 14,
        color: '#666',
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
    ticketContainer: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 10,
        marginVertical: 20,
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    ticketFooter: {
        backgroundColor: '#4caf50',
        padding: 10,
    },
    ticketHeader: {
        backgroundColor: '#4caf50',
        padding: 10,
    },

    ticketBody: {
        padding: 10,
    },
    tripId: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    value: {
        fontSize: 16,
        color: '#000',
    },
});
