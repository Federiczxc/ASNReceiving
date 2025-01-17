import React, { useEffect, useState } from 'react';
import { View, Text, Button, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Link, useRouter, useFocusEffect  } from 'expo-router';

import axios from 'axios';
import api from '../../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
export default function TripList2() {
    const [selectedImage, setSelectedImage] = useState(null);
    const [ocrText, setOcrText] = useState('');
    const [user, setUser] = useState(null);
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
        const getUserData = async () => {
            try {
                const token = await AsyncStorage.getItem('access_token')
                const userData = await AsyncStorage.getItem("user_data");
                if (!token || !userData) {
                    router.push('/'); 
                } else {
                    setUser(JSON.parse(userData)); 
                }
            } catch (error) {
                console.error('No user found', error);
            } finally {
                setIsLoading(false); // Stop loading
            }
        };

    useFocusEffect(
        React.useCallback(() => {
            getUserData();
        }, [])
    );

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
                type: 'image/jpeg', // Update if needed for other file types
                name: 'photo.jpg', // Name for the file
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
            {user ? (
                <>
                    <Text style={styles.text}>Welcome, {user.username}!</Text>
                    <Text style={styles.text}>Employee Number: {user.emp_no}</Text>

                </>
            ) : (
                <Text style={styles.text}>Loading user data...</Text>
            )}

            <Button
                title="Logout"
                onPress={async () => {
                    try {
                        await AsyncStorage.removeItem('access_token');
                        await AsyncStorage.removeItem('user_data');
                        setUser(null); // Clear user state
                        router.push('/'); // Redirect to the login page
                    } catch (error) {
                        console.error('Error during logout:', error);
                    }
                }}
            />
            <Button title="Pick an Image" onPress={pickImage} />
            {selectedImage && <Image source={{ uri: selectedImage }} style={styles.image} />}
            <Button title="Extract Text" onPress={handleOCR} />
            {ocrText ? <Text style={styles.textOutput}>{ocrText}</Text> : null}
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
    image: {
        width: 200,
        height: 200,
        marginTop: 20,
        borderRadius: 8,
    },
    textOutput: {
        marginTop: 20,
        fontSize: 16,
        textAlign: 'center',
    },
});
