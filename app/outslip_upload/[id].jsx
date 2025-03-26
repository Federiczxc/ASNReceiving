
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Button, Dimensions, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Touchable } from 'react-native';
import { BlurView } from 'expo-blur';

import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import api from '../../api';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import Carousel from 'react-native-reanimated-carousel';
import { LogBox } from 'react-native';
import { Notifier, Easing } from 'react-native-notifier';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
export default function OutslipUpload() {
    const [tripBranch, setTripBranch] = useState({
        branch_name: '',
        branch_id: '',
    });
    const [outslipDetail, setOutslipDetail] = useState({
        trip_ticket_id: null,
        trip_ticket_detail_id: null,
        trans_name: '',
        remarks: '',
        branch_id: null,
        branch_name: '',
        ref_trans_date: '',
        ref_trans_id: null,
        items: []
    });
    const navigation = useNavigation();
    const [isLoading, setIsLoading] = useState(true);
    const [ocrText, setOcrText] = useState('');
    const { id } = useLocalSearchParams();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isExpanded2, setIsExpanded2] = useState(true);
    const trip_ticket_detail_id = id;
    const [images, setImages] = useState([null]);
    const [ocrResults, setOcrResults] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [editableOcrText, setEditableOcrText] = useState(ocrText);
    const [opened, setOpened] = useState(false);
    const [remarks, setRemarks] = useState([]);
    const [cameraRef, setCameraRef] = useState(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [isCameraMode, setIsCameraMode] = useState(false);
    const [isCameraFullscreen, setIsCameraFullscreen] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [cameraPreview, setCameraPreview] = useState(false);
    useEffect(() => {
        setIsLoading(true);
        const fetchData = async () => {
            try {
                const accessToken = await AsyncStorage.getItem('access_token');
                const response = await api.get('/outslipview/', {
                    params: { trip_ticket_detail_id },
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                setOutslipDetail(response.data.tripdetails[0]);
                setTripBranch(response.data.branches[0]);
                console.log("out", response.data);
                setIsLoading(false);
                console.log("OCLE", ocrResults.length)
            } catch (error) {
                if (error.response.status === 401) {
                    Alert.alert('Error', 'Your login session has expired. Please log in');
                    router.replace('/');
                    return;
                }
                console.error(error);
            }
        };
        fetchData();
    }, []);
    useFocusEffect(
        useCallback(() => {
            navigation.setOptions({
                headerShown: !(isCameraFullscreen || cameraPreview),
            });
            return () => {
                navigation.setOptions({
                    headerShown: true,
                });
            };
        }, [isCameraFullscreen, cameraPreview])
    );
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

    const takePicture = async (index) => {
        if (cameraRef) {
            const photo = await cameraRef.takePictureAsync({ quality: 1 })
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
        let newImages = [...images];
        newImages[index] = capturedImage;
        setImages(newImages);
        setIsCameraFullscreen(false);
        console.log("setImags", newImages);
        setCameraPreview(false)
    }
    const retakePicture = () => {
        setCapturedImage(null);
        setCameraPreview(false)
        setIsCameraFullscreen(true);
    }
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
            Alert.alert('No image available', 'Please upload an image first.');
            setIsLoading(false);

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
        finally {
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
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            Notifier.showNotification({
                title: 'Success',
                description: 'Outslip uploaded successfully',
                duration: 3000,
            });
            router.replace({
                pathname: 'trip_list_details/[id]',
                params: {
                    id: tripBranch.branch_id,
                    trip_ticket_id: outslipDetail.trip_ticket_id.toString()
                }
            }
            )
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
            }
            if (error.response.status === 401) {
                Alert.alert('Error', 'Your login session has expired. Please log in');
                router.replace('/');
                return;
            }
        }
        finally {
            setIsLoading(false);
        }
    };


    return (

        <View style={styles.container} >
            {isCameraFullscreen && (
                <View style={styles.fullscreenCameraContainer}>
                    <CameraView
                        style={styles.fullscreenCamera}
                        ref={(ref) => setCameraRef(ref)} />
                    <TouchableOpacity
                        style={styles.captureButton}
                        onPress={takePicture}
                    >
                        <Ionicons name='camera-outline' size={42} />
                        {/* <Text style={styles.captureButtonText}>Capture</Text> */}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setIsCameraFullscreen(false)}>
                        <Ionicons name='close-outline' size={32} />
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
                        onPress={() => saveCapturedPicture(currentIndex)}
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
                <View style={styles.container1}>
                    <View style={styles.ticketContainer}>
                        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.7}>
                            <View style={styles.ticketHeader}>
                                <Text style={styles.tripId}>{outslipDetail.trans_name} #{outslipDetail.ref_trans_id}</Text>
                                <Text style={styles.tripId}> Trip Ticket Detail ID #{outslipDetail.trip_ticket_detail_id}</Text>
                                <Text style={styles.tripId}>Branch Name: {tripBranch.branch_name}</Text>
                            </View>
                            <Ionicons
                                name={isExpanded ? "chevron-down" : "chevron-forward"}
                                size={20}
                                color="#666"
                                style={{ alignSelf: 'center' }}
                            />
                            {isExpanded && (
                                <>
                                    <View style={styles.ticketBody}>
                                        <View style={styles.tableHeader}>
                                            <View style={{ width: '30%', paddingLeft: 3 }}>
                                                <Text style={styles.headerLabel}>Barcode</Text>
                                            </View>
                                            <View style={{ width: '45%' }}>

                                                <Text style={styles.headerLabel}>Description</Text>
                                            </View>
                                            <View style={{ width: '15%' }}>

                                                <Text style={styles.headerLabel}>QTY</Text>
                                            </View>
                                            <View style={{ width: '10%' }}>

                                                <Text style={styles.headerLabel}>UOM</Text>
                                            </View>
                                        </View>

                                        {outslipDetail.items.map((item) => (
                                            <View key={`${item.item_id}-${item.ref_trans_id}`}>
                                                <View style={styles.tableBody}>
                                                    <View style={styles.bodyColumn1}>
                                                        <Text style={styles.bodyLabel}>{item.barcode}</Text>
                                                    </View>
                                                    <View style={styles.bodyColumn2}>

                                                        <Text style={styles.bodyLabel}>{item.item_description}</Text>
                                                    </View>
                                                    <View style={styles.bodyColumn3}>

                                                        <Text style={styles.bodyLabel}>{item.item_qty}</Text>
                                                    </View>
                                                    <View style={styles.bodyColumn4}>

                                                        <Text style={styles.bodyLabel}>{item.uom_code}</Text>
                                                    </View>
                                                </View>


                                            </View>
                                        ))}
                                    </View>
                                    <View style={styles.ticketFooter}>
                                        <Text style={styles.footerText}>Remarks: {outslipDetail.remarks}</Text>
                                    </View>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/*     <View style={styles.container2}>
                    <View style={styles.imageContainer}>
                        <TouchableOpacity
                            style={styles.toggleButton}
                            onPress={() => setIsCameraMode(!isCameraMode)}>
                            <Text style={styles.toggleButtonText}>
                                {isCameraMode ? 'Switch to Gallery' : 'Switch to Camera'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.toggleButton}
                            onPress={() => setIsCameraFullscreen(true)}>
                            <Text style={styles.toggleButtonText}>
                                Open Camera
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View> */}
                <View style={styles.container2}>
                    <View style={styles.imageContainer}>

                        <TouchableOpacity onPress={() => setIsExpanded2(!isExpanded2)} activeOpacity={0.7}>
                            <View style={styles.ticketHeader}>
                                <Text style={styles.tripId}>Upload Signed ASN</Text>
                            </View>

                        </TouchableOpacity>
                        {isExpanded2 && (
                            <>
                                <Carousel
                                    key={images.length}
                                    loop={false}
                                    width={Dimensions.get('window').width * 1}
                                    height={Dimensions.get('window').height * 0.5}
                                    data={images}
                                    scrollAnimationDuration={200}
                                    onProgressChange={(_, absoluteProgress) => {
                                        const newIndex = Math.round(absoluteProgress);
                                        setCurrentIndex(newIndex);
                                        setEditableOcrText(ocrResults[newIndex] || '');
                                    }}
                                    style={styles.carouselView}
                                    renderItem={({ index }) => (
                                        <>

                                            {/* Image Preview & OCR Result Card */}
                                            <View style={styles.ocrCard}>
                                                {/*  {ocrResults.length > 0 && (
                                                    <>
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
                                                    </>
                                                )}
                                                    */}
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
                                            <View style={styles.imageView}>
                                                <TouchableOpacity onPress={() => setIsCameraFullscreen(true)} activeOpacity={0.7} style={styles.imageCard}>
                                                    {images[index] ? (
                                                        <>
                                                            <Image source={{ uri: images[index] }} style={styles.image} />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Ionicons color='hsl(0, 0%, 50%)' name='camera-outline' size={40} />
                                                            <Text style={styles.placeholder}>No image captured. Tap to take a picture</Text>
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            </View>

                                            {/* 
                                            {isCameraMode ? (
                                                <View style={styles.cameraContainer}>
                                                    {images[index] ? (
                                                        <Image source={{ uri: images[index] }} style={styles.image} />

                                                    ) :
                                                        (
                                                            <CameraView
                                                                style={styles.camera}
                                                                ref={(ref) => setCameraRef(ref)}
                                                            />
                                                        )}

                                                </View>
                                            ) : (<View style={styles.imageCard}>
                                                <TouchableOpacity onPress={() => pickImage(index)} activeOpacity={0.7} style={styles.imageCard}>
                                                    {images[index] ? (
                                                        <>
                                                            <Image source={{ uri: images[index] }} style={styles.image} />
                                                        </>
                                                    ) : (
                                                        <Text style={styles.placeholder}>No image selected. Press to upload a picture</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>)} */}
                                        </>
                                    )} />
                                <View style={styles.paginationContainer}>
                                    {images.map((_, i) => (
                                        <View key={i} style={[styles.dot, currentIndex === i ? styles.activeDot : null]} />
                                    ))}
                                </View>

                                <View style={styles.buttonContainer}>
                                    {/* <TouchableOpacity style={styles.button} onPress={() => handleOCR(currentIndex)}>
                                        <Text style={styles.buttonText}>Extract Text</Text>
                                    </TouchableOpacity> */}


                                    <TouchableOpacity style={styles.button} onPress={addNewSlide}>
                                        <Text style={styles.buttonText}>Add Slide</Text>

                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.button} onPress={() => removeSlide(currentIndex)}>
                                        <Text style={styles.buttonText}>Remove Slide</Text>
                                    </TouchableOpacity>

                                </View>
                                <TouchableOpacity style={styles.button2} onPress={handleSubmit}>
                                    <Text style={styles.buttonText} >Submit</Text>
                                </TouchableOpacity>
                            </>
                        )}

                    </View>
                </View>

                {/* Buttons Section */}

            </ScrollView>

        </View>
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
        overflow: 'hidden'
    },
    buttonText: {
        color: '#fff',

    },
    cameraContainer: {
        width: '100%',
        height: 200,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    camera: {
        width: '100%',
        height: '100%'
    },
    captureButton: {
        backgroundColor: '#4caf50',
        padding: 5,
        borderRadius: 0,
        alignItems: 'center',
    },
    captureButtonText: {
        color: '#fff',
        fontSize: 16,
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
    carouselView: {
        /* borderWidth: 3,
        borderColor: 'black', */
        flex: 1,
    },
    imageView: {
        width: '100%',
        /* borderColor: 'yellow',
        borderWidth: 1, */
        flex: 1,
    },
    imageCard: {
        width: '100%',
        height: '100%',
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
        /* borderWidth: 1,
        borderColor: 'blue', */
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        resizeMode: 'contain',
        /* borderWidth: 1,
        borderColor: 'red', */
    },

    imageContainer: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 20,
        overflow: 'hidden',
        flex: 1,
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
        marginBottom: 0,
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
        minHeight: 40,
        marginTop: 5
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
    },
    toggleButton: {
        backgroundColor: '#ddd',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
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



    fullscreenCameraContainer: {
        position: 'absolute',
        height: '100%',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
        zIndex: 100,
    },
    fullscreenCamera: {
        flex: 1,
    },
    /* captureButton: {
        position: 'absolute',
        bottom: 30,
        alignSelf: 'center',
        backgroundColor: '#4caf50',
        padding: 15,
        borderRadius: 50,
    }, */
    captureButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        backgroundColor: '#ff4444',
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
    table: {
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
    bodyColumn1: {
        width: '30%',
    },
    bodyColumn2: {
        width: '45%',
    },
    bodyColumn3: {
        width: '10%',
    },
    bodyColumn4: {
        width: '10%',
        marginLeft: 20
    }
});
