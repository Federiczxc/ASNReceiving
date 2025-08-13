
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Button, Dimensions, Image, TextInput, BackHandler, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams, useNavigation, useFocusEffect } from 'expo-router';
import api from '../../api';
import { Ionicons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox'
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

import ImageViewer from 'react-native-image-zoom-viewer';
import Carousel from 'react-native-reanimated-carousel';
import { LogBox } from 'react-native';
import { Notifier, Easing } from 'react-native-notifier';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location'

export default function OutslipUpload() {
    const [outslipDetail, setOutslipDetail] = useState({
        upload_id: null,
        trip_ticket_id: null,
        trip_ticket_detail_id: null,
        trans_name: null,
        remarks: null,
        branch_id: null,
        branch_name: '',
        ref_trans_date: '',
        ref_trans_id: null,
        ref_trans_no: null,
        items: []
    });
    
    const [uploadOutslip, setUploadOutslip] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [ocrText, setOcrText] = useState('');
    const { id } = useLocalSearchParams();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isExpanded2, setIsExpanded2] = useState(false);
    const [isExpanded3, setIsExpanded3] = useState(false);
    const [isExpandedItems, setIsExpandedItems] = useState({});
    const trip_ticket_detail_id = id;
    const [existingImages, setExistingImages] = useState([]);
    const [newImages, setNewImages] = useState([null]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentNewImageIndex, setCurrentNewImageIndex] = useState(0);

    const [cameraRef, setCameraRef] = useState(null);
    const [permission, requestPermission] = useCameraPermissions();

    const [remarks, setRemarks] = useState([]);
    const [newRemarks, setNewRemarks] = useState(['']);

    const [isCameraFullscreen, setIsCameraFullscreen] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [cameraPreview, setCameraPreview] = useState(false);
    const [isChecked, setChecked] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const navigation = useNavigation();
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

    const [isEditMode, setEditMode] = useState(false);
    const [delID, setDelID] = useState();

    const toggleItemExpansion = (itemId) => {
        setIsExpandedItems(prev => (Object.assign(Object.assign({}, prev), { [itemId]: !prev[itemId] })));
    };

    const getCurrentLocation = async () => {
        const startTime = Date.now();

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Error', 'Location permission Denied');
            return null;
        }
        try {
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (lastKnown) {
                const quickTime = Date.now() - startTime;
                console.log(`⚡ Used last known location: ${quickTime} ms`);
                const { latitude, longitude } = lastKnown.coords;
                return { latitude, longitude };
            }

            const gpsStart = Date.now();
            const freshLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Low,
            });
            const gpsTime = Date.now() - gpsStart;
            console.log(`📡 Fetched new GPS location: ${gpsTime} ms`);

            const { latitude, longitude } = freshLocation.coords;
            return { latitude, longitude };
        } catch (error) {
            console.error('❌ Error getting location:', error);
            Alert.alert('Error', 'Failed to get location');
            return null;
        }
    }

    useEffect(() => {
        const backAction = () => {
            Alert.alert('', 'Are you sure you want to go back the previous page? All changes will be lost', [
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

        }
        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction,
        );

        return () => backHandler.remove();
    }, [isLoading]);
    useEffect(() => {
        setIsLoading(true);
        const checkPermissions = async () => {
            await verifyCameraPermissions();
        };
        checkPermissions();
        const fetchData = async () => {
            try {
                const accessToken = await AsyncStorage.getItem('access_token');
                const response = await api.get('/manage-upload-pics/', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    },
                    params: { id: trip_ticket_detail_id }
                });
                const uploadData = response.data.upload_data;
                setUploadOutslip(uploadData);
                setOutslipDetail(response.data.trip_details[0]);
                setExistingImages(uploadData.map(item => item.upload_files));
                setRemarks(uploadData.map(item => item.upload_remarks));
                setDelID(uploadData[0].branch_id)
                console.log("supotot", uploadData);
                console.log("tule", response.data.trip_details[0]);
                console.log("ima", uploadData.map(item => item.upload_files));
                console.log("ocrocr", uploadData.map(item => item.upload_text));
                console.log("rere", uploadData.map(item => item.upload_remarks));
                setIsLoading(false);
            } catch (error) {
                console.error(error);
                if (error.response?.status === 401) {
                    Alert.alert('Error', 'Your login session has expired. Please log in');
                    router.replace('/');
                    return;
                }
            }
        };
        fetchData();
    }, [id])

    useFocusEffect(
        useCallback(() => {
            navigation.setOptions({
                headerShown: !(isCameraFullscreen || cameraPreview || isLoading || isImageViewerVisible),
            });
            return () => {
                navigation.setOptions({
                    headerShown: true,
                });
            };
        }, [isCameraFullscreen, cameraPreview, isLoading, isImageViewerVisible])
    );

    const verifyCameraPermissions = async () => {
        if (permission?.granted) {
            return true;
        }

        const { granted } = await requestPermission();
        if (!granted) {
            Alert.alert(
                'Permission Required',
                'You need to grant camera permissions to take pictures',
                [
                    {
                        text: 'OK',
                        onPress: () => Linking.openSettings() // Opens app settings so user can enable permissions
                    }
                ]
            );
            return false;
        }
        return true;
    };

    const takePicture = async (index) => {
        const hasPermission = await verifyCameraPermissions();
        if (!hasPermission) {
            Alert.alert(
                'Permission Denied',
                'Camera access is required to take pictures',
                [
                    {
                        text: 'Open Settings',
                        onPress: () => Linking.openSettings()
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    }
                ]
            );
            return;
        }
        if (cameraRef) {
            const photo = await cameraRef.takePictureAsync({ quality: 0.5 })
            setCapturedImage(photo.uri)
            setIsCameraFullscreen(false);
            /* let newImages = [...images];
            newImages[index] = photo.uri;
            setImages(newImages);
            setIsCameraMode(false); */
            setCameraPreview(true)
        }
    }
    const saveCapturedPicture = async (index) => {
        console.log("cacap", index);
        console.log("photo.rar", capturedImage);
        let newImage2 = [...newImages];
        newImage2[index] = capturedImage;
        setNewImages(newImage2);
        setIsCameraFullscreen(false);
        console.log("setImags", newImage2);
        setCameraPreview(false)
    }
    const retakePicture = () => {
        setCapturedImage(null);
        setCameraPreview(false)
        setIsCameraFullscreen(true);
    }
    const pickImage = async (index, source) => {
        let result;

        if (source === 'camera') {
            /*  const hasPermission = await verifyCameraPermissions();
             if (!hasPermission) return;
 
             result = await ImagePicker.launchCameraAsync({
                 mediaTypes: ImagePicker.MediaTypeOptions.Images,
                 allowsEditing: false,
                 aspect: [4, 3],
                 quality: 0.75,
             }); */

            if (cameraRef) {
                const photo = await cameraRef.takePictureAsync({ quality: 0.8 })
                setCapturedImage(photo.uri)
                setIsCameraFullscreen(false)
                setCameraPreview(true)
            }
        } else {

            result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 1,
            });
        }

        if (!result.canceled) {
            let updatedNewImages = [...newImages];
            updatedNewImages[index] = result.assets[0].uri;
            setNewImages(updatedNewImages);
        }

    };
    const handleRemarkChange = (index, text) => {
        const updatedRemarks = [...newRemarks];
        updatedRemarks[index] = text;
        setNewRemarks(updatedRemarks);
    };
    const addNewSlide = () => {
        setNewImages(prev => [...prev, null]);
        setNewRemarks(prev => [...prev, '']);

        requestAnimationFrame(() => {
            Notifier.showNotification({
                title: 'Success',
                description: 'Added new slide!',
                duration: 3000,
            });
        });
    };
    const removeNewSlide = (index) => {
        if (newImages.length === 1) {
            Alert.alert("Cannot remove the last slide");
            return;
        }
        let updatedImages = [...newImages];
        updatedImages.splice(index, 1);

        let updatedRemarks = [...newRemarks];
        updatedRemarks.splice(index, 1);

        setNewImages(updatedImages);
        setNewRemarks(updatedRemarks);
        let newIndex = currentNewImageIndex;
        if (currentNewImageIndex === index) {
            newIndex = Math.max(0, index - 1);
        } else if (currentNewImageIndex > index) {
            newIndex = currentNewImageIndex - 1;
        }

        setCurrentNewImageIndex(newIndex);

        requestAnimationFrame(() => {
            Notifier.showNotification({
                title: 'Success',
                description: 'Slide removed!',
                duration: 3000,
            });
        });
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        const accessToken = await AsyncStorage.getItem('access_token');
        const userData = await AsyncStorage.getItem('user_data');
        const userObject = userData ? JSON.parse(userData) : null;
        const username = userObject?.username;
        const location = await getCurrentLocation();
        const { latitude, longitude } = location;
        try {
            const uploadPromises = newImages.map(async (imageUri, index) => {

                const formData = new FormData();
                if (imageUri && typeof imageUri === 'string' && !imageUri.startsWith('http')) {
                    const imageType = imageUri.split('.').pop();
                    const mimeType = `image/${imageType}`;
                    formData.append('image', {
                        uri: imageUri,
                        type: mimeType,
                        name: `photo_${index}.${imageType}`,
                    });
                    formData.append('upload_remarks', newRemarks[index] || '');
                }
                formData.append('latitude', latitude);
                formData.append('longitude', longitude);
                formData.append('trip_ticket_detail_id', outslipDetail.trip_ticket_detail_id.toString());
                formData.append('trip_ticket_id', outslipDetail.trip_ticket_id.toString());
                formData.append('trans_name', outslipDetail.trans_name);
                formData.append('ref_trans_no', outslipDetail.ref_trans_no);
                formData.append('trip_ticket_del_to_id', delID);
                formData.append('branch_name', outslipDetail.branch_name); //outslip 8-11
                formData.append('username', username);

                console.log("paso", formData);
                return api.post('/edit-upload-pics/', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    onUploadProgress: (progressEvent) => {
                        const progress = Math.round(
                            (progressEvent.loaded / progressEvent.total) * 100
                        );
                        setUploadProgress(prev => ({
                            ...prev,
                            [index]: progress
                        }));
                    }
                });
            })
            await Promise.all(uploadPromises)
            Notifier.showNotification({
                title: 'Success',
                description: 'Outslip uploaded successfully',
                duration: 3000,
            });
            router.back();

            setNewImages([null]);
            setNewRemarks(['']);
            /*  router.push('/manage_upload/manage_upload') */
        }

        catch (error) {
            console.error('Error:', error);
            if (error.response?.status === 401) {
                console.log('Response Data:', error.response?.data);
                console.log('Response Status:', error.response?.status);
                console.log('Response Headers:', error.response?.headers);
                const details = error.response?.data.details || [];
                let errorMessage = 'Upload failed:\n';
                details.forEach(detail => {
                    const errors = detail.errors || {};
                    errorMessage += `${detail.upload_image}: ${JSON.stringify(errors)}\n`;
                });
                Alert.alert('Upload Fsailed', JSON.stringify(error.response?.data));
            } else {
                Alert.alert('Upload Failed', 'An unexpected error occurred.');
            }
        }
        finally {
            setIsLoading(false);
        }
    };
    return (
        <SafeAreaProvider>

            <SafeAreaView style={styles.container} >
                {Object.entries(uploadProgress).map(([index, progress]) => (
                    <View key={index} style={styles.progressContainer}>
                        <Text>Uploading image {parseInt(index) + 1}: {progress}%</Text>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${progress}%` }
                                ]}
                            />
                        </View>
                    </View>
                ))}
                {isImageViewerVisible && (
                    <View style={styles.fullscreenImageContainer}>
                        <TouchableOpacity
                            style={styles.closeFullscreenButton}
                            onPress={() => setIsImageViewerVisible(false)}
                        >
                            <Ionicons color='hsl(0,0%,90%)' name='close-outline' size={42} />

                        </TouchableOpacity>
                        <ImageViewer
                            imageUrls={[{ url: fullscreenImage }]}
                            enableImageZoom={true}
                            enableSwipeDown={true}
                            onSwipeDown={() => setIsImageViewerVisible(false)}
                            renderIndicator={() => null}
                            backgroundColor="black"
                            saveToLocalByLongPress={false}
                        />
                    </View>
                )}
                {isCameraFullscreen && (
                    <View style={styles.fullscreenCameraContainer}>
                        <CameraView
                            style={styles.fullscreenCamera}
                            ref={(ref) => setCameraRef(ref)} />
                        <TouchableOpacity
                            style={styles.captureButton}
                            onPress={takePicture}
                        >
                            <Ionicons color='hsl(0,0%,90%)' name='camera-sharp' style={{ alignSelf: 'center' }} size={42} />
                            {/* <Text style={styles.captureButtonText}>Capture</Text> */}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setIsCameraFullscreen(false)}>
                            <Ionicons color='hsl(0,0%,90%)' name='close-outline' size={42} />
                            {/*<Text style={styles.closeButtonText}>Close</Text> */}
                        </TouchableOpacity>
                    </View>
                )}
                {cameraPreview && !isCameraFullscreen && (
                    <View
                        style={styles.fullscreenPreviewContainer}
                    >
                        <Image source={{ uri: capturedImage }} style={styles.fullscreenPreviewImage} />
                        <TouchableOpacity
                            onPress={retakePicture}
                            style={styles.retakeButton}

                        >
                            <Ionicons color='hsl(0,0%,90%)' name={"trash-outline"} size={36} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => saveCapturedPicture(currentNewImageIndex)}
                            style={styles.checkButton}
                        >
                            <Ionicons color='hsl(0,0%,90%)' name={"checkmark-outline"} size={42} />

                        </TouchableOpacity>
                    </View>

                )}
                <ScrollView>

                    {isLoading && (
                        <BlurView intensity={400} style={styles.overlayLoading} >
                            <ActivityIndicator size="large" color="#4CAF50" />
                        </BlurView>
                    )}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleButton, { backgroundColor: isEditMode ? '#4caf50' : '#ffd33d' }]}
                            onPress={() => setEditMode(!isEditMode)}>
                            <Text style={styles.toggleButtonText}>
                                {isEditMode ? 'View Uploaded' : 'Add Pictures'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {!isEditMode && (
                        <>
                            <View style={styles.container1}>
                                <View style={styles.ticketContainer}>
                                    <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
                                        <View style={styles.ticketHeader}>
                                            <Text style={styles.tripId}>{outslipDetail.trans_name} #{outslipDetail.ref_trans_no}</Text>
                                            <Text style={styles.tripId2}> Trip Ticket Detail ID #{outslipDetail.trip_ticket_detail_id}</Text>
                                            <Text style={styles.tripId3}>Branch Name: {outslipDetail.branch_name}</Text>
                                        </View>
                                        <Ionicons
                                            name={isExpanded ? "chevron-down" : "chevron-forward"}
                                            size={20}
                                            color="#666"
                                            style={{ alignSelf: 'center' }}
                                        />
                                    </TouchableOpacity>
                                    {isExpanded && (
                                        <>
                                            <View style={styles.ticketBody}>
                                                <View style={styles.tableHeader}>
                                                    <View style={{ width: '10%', paddingLeft: 3 }}>
                                                        <Text style={styles.headerLabel}>PKG</Text>
                                                    </View>
                                                    <View style={{ width: '15%' }}>
                                                        <Text style={styles.headerLabel}>COMP</Text>
                                                    </View>
                                                    <View style={{ width: '25%' }}>
                                                        <Text style={styles.headerLabel}>Barcode</Text>
                                                    </View>
                                                    <View style={{ width: '30%' }}>
                                                        <Text style={styles.headerLabel}>Description</Text>
                                                    </View>
                                                    <View style={{ width: '10%' }}>
                                                        <Text style={styles.headerLabel}>QTY</Text>
                                                    </View>
                                                    <View style={{ width: '10%' }}>
                                                        <Text style={styles.headerLabel}>UOM</Text>
                                                    </View>
                                                </View>
                                            </View>
                                            {outslipDetail.items.map((item) => (
                                                <View key={`${item.item_id}-${item.ref_trans_detail_id}-${item.i_trans_no}`}>
                                                    <>
                                                        <TouchableOpacity onPress={() => toggleItemExpansion(item.i_trans_no)} activeOpacity={0.7}>
                                                            <View style={styles.tableBody}>
                                                                <View style={styles.bodyColumnPKG}>
                                                                    <Checkbox
                                                                        value={item.main_item === true}
                                                                        color={item.main_item === true ? '#4CAF50' : undefined}
                                                                    />
                                                                </View>
                                                                <View style={styles.bodyColumnCOMP}>
                                                                    <Checkbox
                                                                        value={item.component_item === 1}
                                                                        color={item.component_item === 1 ? '#4CAF50' : undefined}
                                                                    />
                                                                </View>
                                                                <View style={styles.bodyColumn1}>
                                                                    <Text style={styles.bodyLabel}>{item.barcode}</Text>
                                                                </View>
                                                                <View style={styles.bodyColumn2}>
                                                                    <Text style={styles.bodyLabel}>{item.item_description}</Text>
                                                                </View>
                                                                <View style={styles.bodyColumn3}>
                                                                    <Text style={styles.bodyLabelQTY}>{Math.round(Number(item.item_qty))}</Text>
                                                                </View>
                                                                <View style={styles.bodyColumn4}>
                                                                    <Text style={styles.bodyLabel}>{item.uom_code}</Text>
                                                                </View>
                                                            </View>
                                                            <View style={styles.expandedChevron}>
                                                                <Ionicons
                                                                    name={isExpandedItems[item.i_trans_no] ? "chevron-down" : "chevron-forward"}
                                                                    size={20}
                                                                    color="#666"
                                                                />
                                                                <Text style={styles.expandedChevronText}>
                                                                    Receiving Quantity
                                                                </Text>
                                                            </View>
                                                        </TouchableOpacity>
                                                    </>
                                                    {
                                                        isExpandedItems[item.i_trans_no] && (
                                                            <>
                                                                {
                                                                    Array.isArray(item.serial_details) && item.serial_details.length > 0 ? (
                                                                        item.serial_details.map((serial, idx) => (
                                                                            <View key={`${item.ref_trans_id}-${idx}`} style={styles.expandedItems}>
                                                                                <View style={styles.bodyColumnPKG}>
                                                                                    <Text style={styles.expandedValue}></Text>
                                                                                </View>
                                                                                <View style={styles.bodyColumnCOMP}>
                                                                                    <Text style={styles.expandedValue}></Text>
                                                                                </View>
                                                                                <View style={styles.bodyColumn1}>
                                                                                    <Text style={styles.expandedValue}>{serial.batch_no || 'N/A'}</Text>
                                                                                </View>
                                                                                <View style={styles.bodyColumn2}>
                                                                                    <Text style={styles.expandedValue}>{serial.ser_bat_no || 'N/A'}</Text>
                                                                                </View>
                                                                                <View style={styles.bodyColumn3}>
                                                                                    <Text style={styles.expandedValue}>{serial.received_qty || '0'}</Text>
                                                                                </View>
                                                                                <View style={styles.bodyColumn4}>
                                                                                    <Text style={styles.expandedValue}>{serial.uom_code || 'N/A'}</Text>
                                                                                </View>
                                                                            </View>
                                                                        ))
                                                                    ) : (
                                                                        <View style={styles.expandedItems}>
                                                                            <Text style={styles.expandedValue}>No serial details available</Text>
                                                                        </View>
                                                                    )
                                                                }
                                                            </>
                                                        )
                                                    }
                                                </View>
                                            ))}
                                            <View style={styles.ticketFooter}>
                                                <Text style={styles.footerText}>Remarks: {outslipDetail.remarks}</Text>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>

                            <View style={styles.container2}>
                                <View style={styles.imageContainer}>
                                    <TouchableOpacity onPress={() => setIsExpanded2(!isExpanded2)} activeOpacity={0.7}>
                                        <View style={styles.ticketHeader}>
                                            <Text style={styles.tripId}>Uploaded Images</Text>
                                        </View>
                                        <Ionicons
                                            name={isExpanded2 ? "chevron-down" : "chevron-forward"}
                                            size={20}
                                            color="#666"
                                            style={{ alignSelf: 'center' }}
                                        />
                                    </TouchableOpacity>
                                    {isExpanded2 && (
                                        <>
                                            <Carousel
                                                loop={false}
                                                width={Dimensions.get('window').width * 1}
                                                height={Dimensions.get('window').height * 0.5}
                                                data={uploadOutslip}
                                                scrollAnimationDuration={200}
                                                onProgressChange={(_, absoluteProgress) => {
                                                    const newIndex = Math.round(absoluteProgress);
                                                    setCurrentIndex(newIndex);
                                                }}
                                                renderItem={({ index }) => (
                                                    <>
                                                        {/* Image Preview & OCR Result Card */}
                                                        <View style={styles.ocrCard}>
                                                            {/*  <Text style={styles.ocrTitle}>OCR Result:</Text>
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
                                    editable={false}
                                /> */}
                                                            <Text style={styles.ocrTitle}>Remarks:</Text>
                                                            <TextInput
                                                                style={styles.textOutput}
                                                                value={remarks[index] || ''}
                                                                onChangeText={(text) => {
                                                                    let newRemarks = [...remarks];
                                                                    newRemarks[currentIndex] = text;
                                                                    setRemarks(newRemarks)
                                                                }}
                                                                multiline
                                                                editable={false}
                                                            />
                                                        </View>
                                                        <View style={styles.imageView}>
                                                            <TouchableOpacity onPress={() => {
                                                                setFullscreenImage(existingImages[index]);
                                                                setIsImageViewerVisible(true);
                                                            }} activeOpacity={0.7} style={styles.imageCard}>
                                                                <>
                                                                    {existingImages[index] ? (
                                                                        <>
                                                                            <Image
                                                                                source={{ uri: existingImages[index] }}
                                                                                style={styles.image}
                                                                                resizeMode="contain"
                                                                            />
                                                                        </>
                                                                    ) : (
                                                                        <Text style={styles.placeholder}>No image selected. Press to upload a picture</Text>
                                                                    )}
                                                                </>
                                                            </TouchableOpacity>
                                                        </View>

                                                        {/* Buttons Section */}
                                                    </>
                                                )} />
                                            <View style={styles.paginationContainer}>
                                                {existingImages.map((_, i) => (
                                                    <View key={i} style={[styles.dot, currentIndex === i ? styles.activeDot : null]} />
                                                ))}
                                            </View>
                                        </>
                                    )}
                                </View>

                            </View>
                        </>
                    )}

                    {isEditMode && (
                        <View style={styles.container3}>
                            <View style={styles.imageContainer}>
                                <TouchableOpacity onPress={() => setIsExpanded3(!isExpanded3)} activeOpacity={0.7}>
                                    <View style={styles.ticketHeader2}>
                                        <Text style={[styles.tripId, { color: 'black' }]}>Add New Images</Text>
                                    </View>
                                    <Ionicons
                                        name={isExpanded3 ? "chevron-down" : "chevron-forward"}
                                        size={20}
                                        color="#666"
                                        style={{ alignSelf: 'center' }}
                                    />
                                </TouchableOpacity>
                                {isExpanded3 && (
                                    <>
                                        <Carousel
                                            key={newImages.length}
                                            loop={false}
                                            width={Dimensions.get('window').width * 1}
                                            height={Dimensions.get('window').height * 0.5}
                                            data={newImages}
                                            scrollAnimationDuration={200}
                                            onSnapToItem={(index) => setCurrentNewImageIndex(index)}
                                            onProgressChange={(_, absoluteProgress) => {
                                                const newIndex = Math.round(absoluteProgress);
                                                setCurrentNewImageIndex(newIndex);
                                            }}
                                            renderItem={({ item, index }) => (
                                                <>
                                                    {/* Image Preview & OCR Result Card */}
                                                    <View style={styles.ocrCard}>
                                                        {/*  <Text style={styles.ocrTitle}>OCR Result:</Text>
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
                                    editable={false}
                                /> */}
                                                        <Text style={styles.ocrTitle}>Remarks:</Text>
                                                        <TextInput
                                                            style={styles.textOutput}
                                                            value={newRemarks[index] || ''}
                                                            onChangeText={(text) => handleRemarkChange(index, text)}
                                                            multiline
                                                            placeholder='Enter remarks here if needed'
                                                        />
                                                    </View>
                                                    <View style={styles.imageView}>
                                                        <TouchableOpacity onPress={() => setIsCameraFullscreen(true)} activeOpacity={0.7} style={styles.imageCard2}>
                                                            <>
                                                                {item ? (
                                                                    <>
                                                                        <Image source={{ uri: item }} style={styles.image} />
                                                                    </>
                                                                ) : (
                                                                    <Text style={styles.placeholder}>No image captured. Tap to take a picture</Text>
                                                                )}
                                                            </>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            onPress={() => pickImage(index, 'library')}
                                                            style={styles.galleryButton}
                                                        >
                                                            <Text style={styles.galleryText}>Choose from Gallery</Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                    {/* Buttons Section */}
                                                </>
                                            )} />
                                        <View style={styles.paginationContainer}>
                                            {newImages.map((_, i) => (
                                                <View key={i} style={[styles.dot, currentNewImageIndex === i ? styles.activeDot : null]} />
                                            ))}
                                        </View>
                                        <View style={styles.buttonContainer}>
                                            <TouchableOpacity style={styles.button} onPress={addNewSlide}>
                                                <Text style={styles.buttonText}>Add Picture</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.button} onPress={() => removeNewSlide(currentNewImageIndex)}>
                                                <Text style={styles.buttonText}>Remove Slide</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.button2} onPress={handleSubmit} disabled={!newImages.some(img => img !== null)}>
                                                <Text style={styles.buttonText} >Submit</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}

                            </View>

                        </View>
                    )}

                </ScrollView>
            </SafeAreaView>
        </SafeAreaProvider >

    );
}
const styles = StyleSheet.create({
    activeDot: {
        backgroundColor: '#4caf50',  // Active dot color
        width: 12,
        height: 12,
    },
    button: {
        width: '35%',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 10,
        padding: 5,
        marginVertical: 5,
        marginHorizontal: 20,
        backgroundColor: '#2986cc',  // Active dot color
    },
    button2: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 5,
        padding: 15,
        backgroundColor: '#2986cc',  // Active dot color
        marginTop: 15
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        flexWrap: 'wrap',
        flex: 1,
        paddingHorizontal: 0,
        overflow: 'hidden',
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
    container3: {
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
        borderWidth: 0.5,
        padding: 10
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
    imageView: {
        width: '100%',
        flex: 1,
    },
    imageCard: {
        width: '100%',
        height: '100%',
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    imageCard2: {
        width: '100%',
        height: '80%',
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    galleryButton: {
        width: '100%',
        height: '15%',
        alignItems: 'center',
        alignSelf: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        padding: 10,
        backgroundColor: '#2986cc',  // Active dot color
    },
    galleryText: {
        color: '#fff'
    },
    imageContainer: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 10,
        marginVertical: 20,
        overflow: 'hidden',
        flex: 1,
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
        marginVertical: 5,
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
    ticketHeader2: {
        backgroundColor: '#ffd33d',
        padding: 10,
    },
    ticketBody: {
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
    tripId3: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    value: {
        fontSize: 16,
        color: '#000',
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
    bodyLabelQTY: {
        fontSize: 11,
        /*  fontWeight: 'bold', */
        /* borderWidth: 1, */
        textAlign: 'center',
    },
    bodyColumn1: { //barcode
        width: '25%',
        alignSelf: 'center',
    },
    bodyColumn2: { // description
        width: '30%',
        alignSelf: 'center',
    },
    bodyColumn3: {
        width: '10%',
        alignSelf: 'center',
    },
    bodyColumn4: {
        width: '10%',
        /* marginLeft: 20 */
        alignSelf: 'center',
    },
    bodyColumnPKG: {
        width: '10%',
        /* marginLeft: 20 */
        alignSelf: 'center',
    },
    bodyColumnCOMP: {
        width: '15%',
        /* marginLeft: 20 */
        alignSelf: 'center',
    },
    expandedItems: {
        backgroundColor: '#ffd33d',
        flexDirection: 'row',
        padding: 5,
        borderWidth: 0.5,
    },
    expandedChevron: {
        backgroundColor: '#ffd33d',
        flex: 1,
        flexWrap: 'wrap',
        flexDirection: 'row',
    },
    expandedChevronText: {
        fontWeight: 300,
        fontStyle: "italic",
    },
    expandedLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000',
    },
    expandedValue: {
        fontSize: 10,
        color: '#000',
    },
    expandedQty: {
        fontSize: 10,
        textAlign: 'center',
    },
    fullscreenCameraContainer: {
        position: 'absolute',
        height: '100%',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
        zIndex: 100,
        justifyContent: 'center',

    },
    fullscreenCamera: {
        aspectRatio: 3 / 4,
        width: '100%',
        alignSelf: 'center',
    },
    captureButton: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        /* backgroundColor: '#4caf50', */
        backgroundColor: 'transparent',
        borderColor: 'hsl(0,0%,90%)',
        borderWidth: 3,
        padding: 15,
        borderRadius: 50,
    },
    captureButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        /* backgroundColor: '#ff4444', */
        backgroundColor: 'transparent',
        padding: 5,
        borderRadius: 100,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    fullscreenPreviewContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',

        zIndex: 100, // Ensure it appears on top of everything
    },
    fullscreenPreviewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
        flex: 1,
    },
    retakeButton: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        backgroundColor: 'transparent',
        padding: 5,
        borderRadius: 100,
        /* borderWidth: 2, */
        borderColor: '#ff4444',
    },
    checkButton: {
        position: 'absolute',
        bottom: 40,
        right: 20,
        backgroundColor: 'transparent',
        padding: 5,
        borderRadius: 100,
        /*  borderWidth: 2, */
        borderColor: 'cyan',
    },
    fullscreenImageContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
        zIndex: 1000,
    },
    closeFullscreenButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 1001,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
        padding: 10,

    },
    toggleContainer: {
        borderWidth: 1,
        alignSelf: 'center',
        width: '100%',
        alignItems: 'center',
    },
    toggleButton: {
        padding: 15,
        width: '100%',
        alignItems: 'center',
    },
    toggleButtonText: {
        fontSize: 16
    },
    progressContainer: {
        marginVertical: 5,
        padding: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 5,
    },
    progressBar: {
        height: 10,
        backgroundColor: '#e0e0e0',
        borderRadius: 5,
        marginTop: 5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
    },
});
