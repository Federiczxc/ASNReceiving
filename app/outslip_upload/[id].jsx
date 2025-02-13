import React, { useEffect, useState } from 'react';
import { View, Text, Button, Image, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import api from '../../api';

export default function OutslipUpload() {
    const [tripBranch, setTripBranch] = useState({
       branch_name: ''
    });

    const [selectedImage, setSelectedImage] = useState(null);
    const [ocrText, setOcrText] = useState('');
    const { id, branch_id } = useLocalSearchParams();
    const trip_ticket_id = id;
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/tripbranch/', {
                    params: { id }
                });
                setTripBranch(response.data[0]);
                console.log("tite", response.data);
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

            setOcrText(response.data.text || 'No text detected');
        } catch (error) {
            console.error('Error during OCR processing:', error);
            Alert.alert('Error', 'Failed to process the image. Please try again.');
        }
    };

    return (
        <View style={styles.container}>
            {/* Header Card */}
            <View style={styles.card}>
                <Text style={styles.header}>Trip Ticket ID: {trip_ticket_id}</Text>
                <Text style={styles.header}>Branch Name: {tripBranch.branch_name}</Text>
            </View>

            {/* Image Preview & OCR Result Card */}
            <View style={styles.imageCard}>
                <View style={styles.imageContainer}>
                    <Text style={styles.ocrTitle}>Picture:</Text>

                    <TouchableOpacity onPress={pickImage} activeOpacity={0.0} style={styles.touchable}>
                        {selectedImage ? (
                            <Image source={{ uri: selectedImage }} style={styles.image} />
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
                <Button title="Extract Text" onPress={handleOCR} />
                <Button title="Submit" onPress={handleOCR} />
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
        backgroundColor: '#f8f9fa',
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
        width: '90%',
        marginBottom: 20,
        alignItems: 'center',
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    imageCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        width: '90%',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    imageContainer: {
        width: '100%',
        height: 200,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
        resizeMode: 'contain',

    },
    imgTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 20,
        marginTop: 10,
        color: '#333',
    },
    placeholder: {
        fontSize: 14,
        color: '#666',
    },
    ocrContainer: {
        width: '45%',
        justifyContent: 'center',
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
    },
    touchable: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    }
    ,
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '90%',
    },
});
