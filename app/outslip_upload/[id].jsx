
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Button, Modal, Dimensions, Image, TextInput, BackHandler, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Touchable, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location'
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import api from '../../api';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import Carousel from 'react-native-reanimated-carousel';
import { Notifier, Easing } from 'react-native-notifier';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';
export default function OutslipUpload() {
   
    const [outslipDetail, setOutslipDetail] = useState({
        trip_ticket_id: null,
        trip_ticket_detail_id: null,
        trans_name: '',
        remarks: '',
        branch_id: null,
        branch_name: '',
        ref_trans_date: '',
        ref_trans_id: null,
        ref_trans_no: null,
        items: []
    });

    const getCurrentLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Error', 'Location permission denied');
            return null;
        }
        try {
            const location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            console.log('Latitude', latitude);
            console.log('Longitude', longitude);
            return { latitude, longitude };
        }
        catch (error) {
            console.error('Error getting location:', error);
            Alert.alert('Error', 'Failed to get location');
            return null;
        }
    };

    const navigation = useNavigation();
    const [isLoading, setIsLoading] = useState(false);
    const [ocrText, setOcrText] = useState('');
    const { id } = useLocalSearchParams();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isExpanded2, setIsExpanded2] = useState(true);
    const [isExpanded3, setIsExpanded3] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const [isExpandedItems, setIsExpandedItems] = useState({});

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
    const [quantity, setQuantity] = useState({});
    const [serialQuantities, setSerialQuantities] = useState({});
    const [receiver, setReceiver] = useState('');
    const [isCameraFullscreen, setIsCameraFullscreen] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [cameraPreview, setCameraPreview] = useState(false);
    const [isChecked, setChecked] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [page, setPage] = useState(1);
    const pageSize = 25;
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(''); //
    const [receiverData, setReceiverData] = useState({
        branch_receiver_id: null,
        branch_id: null,
        full_name: '',
    });

    const bottomSheetRef = useRef(null);
    const snapPoints = ['100%'];
    const [selectedReceiver, setSelectedReceiver] = useState('');
    const [receiverID, setReceiverID] = useState(0);

    const handleReceiverSelect = (id, receiver) => {
        console.log("rerecsec", id, receiver);
        setSelectedReceiver(receiver);
        setReceiverID(id);
        bottomSheetRef.current?.close();
    }
    useEffect(() => {
        const backAction = () => {
            Alert.alert('', 'Are you sure you want to go back to previous page? All unsaved changes will be lost', [
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
                const response = await api.get('/outslipview/', {
                    params: { trip_ticket_detail_id },
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
                const initialQuantities = {};
                const initialSerialQuantities = {};

                response.data.tripdetails[0].items.forEach(item => {
                    initialQuantities[item.item_id] = Math.round(Number(item.item_qty)).toString();

                    if (Array.isArray(item.serial_details)) {
                        item.serial_details.forEach(serial => {
                            const uniqueKey = `${serial.i_trans_no}_${serial.serbat_id}`;
                            initialSerialQuantities[uniqueKey] = Math.round(Number(serial.item_qty)).toString();

                        });
                    }
                });
                setQuantity(initialQuantities);
                setSerialQuantities(initialSerialQuantities);
                setOutslipDetail(response.data.tripdetails[0]);
                console.log("out", response.data.tripdetails[0]);
                setIsLoading(false);
                /* console.log("OCLE", ocrResults.length) */
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

    const fetchReceiver = async (pageNum = page) => {
        if (isLoadingMore) return;
        try {
            setIsLoadingMore(true);
            console.log("ou2t", outslipDetail.branch_id);
            const response = await api.get('/receiverlist/', {
                params: {
                    page: pageNum,
                    page_size: pageSize,
                    search: debouncedSearchQuery,
                    branch_id: outslipDetail.branch_id,
                }
            });
            setReceiverData(prev =>
                pageNum === 1
                    ? response.data.results
                    : [...prev, ...response.data.results]
            );
            setHasMore(!!response.data.next);
            console.log("recrec", response.data.results);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingMore(false);
        }
    };
    useEffect(() => {
        if (debouncedSearchQuery !== searchQuery) {
            setDebouncedSearchQuery(searchQuery);
            setPage(1);
            setReceiverData([]);
            setHasMore(true);
            if (bottomSheetRef.current?.expand) {
                fetchReceiver(1);
            }
        }
    }, [searchQuery]);
    const openReceiverSheet = async () => {
        //if (receiverData.length === 0) {
        await fetchReceiver(1);
        // }
        bottomSheetRef.current?.expand();
    }
    useFocusEffect(
        useCallback(() => {
            navigation.setOptions({
                headerShown: !(isCameraFullscreen || cameraPreview || isLoading),
            });
            return () => {
                navigation.setOptions({
                    headerShown: true,
                });
            };
        }, [isCameraFullscreen, cameraPreview, isLoading])
    );
    /* console.log("brara", tripBranch); */

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
            const photo = await cameraRef.takePictureAsync({ quality: 0.8 })
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
        /* console.log("cacap", index);
        console.log("photo.rar", capturedImage); */
        let newImages = [...images];
        newImages[index] = capturedImage;
        setImages(newImages);
        setIsCameraFullscreen(false);
        /* console.log("setImags", newImages); */
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
        /* console.log("imaima", images) */

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

    const validateSerialQuantity = (itemId, serialId, serbatId, newValue) => {
        const Item = outslipDetail.items.find(item => item.item_id === itemId);
        if (!Item)
            return false;
        const docQTY = Number(Item.item_qty);
        const itemQTY = Number(newValue) || 0;
        if (itemQTY > docQTY) {
            Alert.alert('Invalid Quantity', `Receiving quantity must not exceed Document quantity`);
            return false;
        }
        return true;
    }

    /* const handleOCR = async (index) => {
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
    }; */
    const toggleItemExpansion = (itemId) => {
        setIsExpandedItems(prev => (Object.assign(Object.assign({}, prev), { [itemId]: !prev[itemId] })));
    };
    const handleSubmit = async () => {
        const hasImages = images.some(img => img !== null);
        if (!hasImages) {
            Alert.alert('Error', 'Please capture at least one image before submitting');
            setIsLoading(false);
            return;
        }
        if (!selectedReceiver) {
            Alert.alert('Error', 'Receiver is required. Please input who received the outslip');
            setIsLoading(false);
            return;
        }
        /*  Object.entries(serialQuantities).forEach(([serbat_id, qty]) => {
             formData.append(`serials[${serbat_id}]`, qty);
         }); */
        setIsLoading(true);
        const accessToken = await AsyncStorage.getItem('access_token');
        const userData = await AsyncStorage.getItem('user_data');
        const userId = userData ? JSON.parse(userData).user_id : null;
        const userObject = userData ? JSON.parse(userData) : null;
        const username = userObject?.username;
        const location = await getCurrentLocation();
        if (!location) {
            Alert.alert('Error', 'Failed to get location')
            return;
        }
        const { latitude, longitude } = location;
        //console.log("tite", quantity);

        //console.log('acotot', userId, outslipDetail.trip_ticket_id, outslipDetail.branch_id,);
        try {
            //CHECK CHECKIN

            const timeInCheck = await api.get('/check-clock-in/', {
                params: {
                    trip_ticket_id: outslipDetail.trip_ticket_id,
                    trip_ticket_del_to_id: outslipDetail.trip_ticket_del_to_id,
                },
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${accessToken}`,
                },
            })

            //console.log('aa', timeInCheck.data)
            const hasClockedIn = timeInCheck.data.has_clocked_in || false;
            //console.log('dad', hasClockedIn);

            if (!hasClockedIn) {

                const clockInData = {
                    latitude_in: latitude,
                    longitude_in: longitude,
                    created_by: userId,
                    trip_ticket_id: outslipDetail.trip_ticket_id,
                    trip_ticket_del_to_id: outslipDetail.trip_ticket_del_to_id,
                };

                const clockInResponse = await api.post("/clock-in/", clockInData, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    },
                })
                //console.log('ti', clockInResponse)
            }
            const receivingData = outslipDetail.items.flatMap(item => {
                if (!Array.isArray(item.serial_details)) return [];

                return item.serial_details.map(serial => ({
                    server_id: 1,
                    trip_ticket_id: outslipDetail.trip_ticket_id,
                    trip_ticket_detail_id: outslipDetail.trip_ticket_detail_id,
                    ref_trans_id: outslipDetail.ref_trans_id,
                    ref_trans_no: outslipDetail.ref_trans_no,
                    trans_code_id: outslipDetail.ref_trans_code_id,
                    item_id: item.item_id,
                    item_qty: Number(serialQuantities[`${serial.i_trans_no}_${serial.serbat_id}`] || 0),
                    doc_qty: item.item_qty || 0,
                    ref_trans_detail_id: item.ref_trans_detail_id,
                    ref_trans_detail_pkg_id: item.ref_trans_detail_pkg_id,
                    i_trans_no: serial.i_trans_no,
                    p_trans_no: serial.p_trans_no,
                    main_item: item.main_item,
                    component_item: item.component_item,
                    ser_bat_no: serial.ser_bat_no,
                    batch_no: serial.batch_no,
                    serbat_id: serial.serbat_id,
                    created_by: userId,
                    created_date: new Date().toISOString(),
                    updated_by: userId,
                    updated_date: new Date().toISOString(),
                }));
            });
            const receivingForm = new FormData();
            receivingForm.append('receiving_data', JSON.stringify(receivingData));
            //console.log("erere", receivingData);
            //console.log("recrec", receivingForm);


            const receivingResponse = await api.post('/trip-ticket-receive/', receivingForm, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            console.log('succrecv', receivingResponse);
            const uploadPromises = images.map(async (imageUri, index) => {
                if (!imageUri) return;

                const imageType = imageUri.split('.').pop();
                const mimeType = `image/${imageType}`;

                const formData = new FormData();
                formData.append('image', {
                    uri: imageUri,
                    type: mimeType,
                    name: `photo_${index}.${imageType}`,
                });
                formData.append('latitude', latitude);
                formData.append('longitude', longitude);
                formData.append('trip_ticket_detail_id', trip_ticket_detail_id.toString());
                formData.append('trip_ticket_id', outslipDetail.trip_ticket_id.toString());
                formData.append('created_date', new Date().toISOString().slice(0, 19).replace('T', ' '));
                formData.append('created_by', userId);
                formData.append('branch_id', outslipDetail.trip_ticket_del_to_id);
                formData.append('branch_name', outslipDetail.branch_name);
                formData.append('ref_trans_no', outslipDetail.ref_trans_no);
                formData.append('trans_name', outslipDetail.trans_name);
                formData.append('username', username);
                formData.append('upload_text', ocrResults[index] || '');
                formData.append('upload_remarks', remarks[index] || '');
                formData.append('received_by', selectedReceiver || '');

                return api.post('/outslipupload/', formData, {
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
            });

            // Wait for all image uploads to complete
            await Promise.all(uploadPromises);

            Notifier.showNotification({
                title: 'Success',
                description: 'Outslip uploaded successfully',
                duration: 3000,
            });

            router.back();
        } catch (error) {
            console.error('Error:', error);

            if (error.response?.status === 401) {
                Alert.alert('Error', 'Your login session has expired. Please log in');
                router.replace('/');
                return;
            }
            Alert.alert('Upload Failed', JSON.stringify(error.response.data));
            return;
            /*  Alert.alert(
                 'Upload Error',
                 'Failed to complete the upload. Please check your connection and try again.',
                 [{ text: 'OK' }]
             ); */
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <SafeAreaProvider>


            <SafeAreaView style={styles.container}>
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
                                    <Text style={styles.tripId}>{outslipDetail.trans_name} #{outslipDetail.ref_trans_no}</Text>
                                    <Text style={styles.tripId2}>Trip Ticket Detail #{outslipDetail.trip_ticket_detail_id}</Text>
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

                                                                {/* <TextInput style={styles.bodyLabelQTY}
                                                                keyboardType='numeric'
                                                                maxLength={10}
                                                                onChangeText={(text) => {
                                                                    setQuantity(prev => ({
                                                                        ...prev,
                                                                        [item.item_id]: text
                                                                    }));
                                                                }}
                                                                value={quantity[item.item_id] || ''}
                                                                placeholder={Math.round(Number(item.item_qty)).toString()}
                                                            /> */}
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
                                                                Edit Receiving Quantity
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
                                                                                <TextInput style={styles.expandedQty}
                                                                                    maxLength={10}
                                                                                    keyboardType='numeric'
                                                                                    onChangeText={(text) => {
                                                                                        const uniqueKey = `${serial.i_trans_no}_${serial.serbat_id}`
                                                                                        if (validateSerialQuantity(item.item_id, serial.i_trans_no, serial.serbat_id, text)) {
                                                                                            setSerialQuantities(prev => ({
                                                                                                ...prev,
                                                                                                [uniqueKey]: text,
                                                                                            }));
                                                                                        }
                                                                                    }}
                                                                                    value={serialQuantities[`${serial.i_trans_no}_${serial.serbat_id}`] || 0}
                                                                                />
                                                                                {/* <Text style={styles.expandedValue}>{serial.item_qty || 'N/A'}</Text> */}

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

                                    </View>
                                    <View style={styles.ticketFooter}>
                                        <Text style={styles.footerText}>Remarks: {outslipDetail.remarks}</Text>
                                    </View>
                                </>
                            )}
                            <Modal
                                animationType="fade"
                                transparent={true}
                                visible={modalVisible}
                                onRequestClose={() => setModalVisible(false)}>
                                {/* Outer container that covers entire screen */}
                                <View style={styles.modalOverlay}>
                                    {/* Centered content container */}
                                    <View style={styles.modalContent}>
                                        <Text style={styles.modalText}>
                                            Are you sure you want to upload? Once uploaded, you can't make any changes.
                                        </Text>

                                        <View style={styles.modalButtonsContainer}>
                                            <TouchableOpacity
                                                style={[styles.modalButton, styles.cancelButton]}
                                                onPress={() => setModalVisible(false)}
                                                activeOpacity={0.7}>
                                                <Text style={styles.modalButtonText}>Cancel</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.modalButton, styles.confirmButton]}
                                                onPress={() => {
                                                    setModalVisible(false);
                                                    handleSubmit();
                                                }}
                                                activeOpacity={0.7}>
                                                <Text style={styles.modalButtonText}>Confirm</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </Modal>
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
                                    <Text style={styles.tripId}>Upload Images</Text>
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
                                        key={images.length}
                                        loop={false}
                                        width={Dimensions.get('window').width * 1}
                                        height={Dimensions.get('window').height * 0.45}
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
                                                    )}le
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

                                </>
                            )}

                        </View>
                    </View>

                    <View style={styles.container3}>

                        <View style={styles.imageContainer}>

                            <TouchableOpacity onPress={() => setIsExpanded3(!isExpanded3)} activeOpacity={0.7}>
                                <View style={styles.ticketHeader}>
                                    <Text style={styles.tripId}>Other Details</Text>
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
                                    <View style={styles.receiveView}>

                                        <TouchableOpacity
                                            onPress={openReceiverSheet}
                                            style={styles.receiverSelector}
                                        >
                                            <Text style={styles.receiverSelectorText}>
                                                {'Select Receiver'}
                                            </Text>
                                            <Ionicons name="chevron-down" size={20} color="gray" />
                                        </TouchableOpacity>
                                        <TextInput
                                            style={styles.receiverSelector}
                                            value={selectedReceiver}
                                            onChangeText={setSelectedReceiver}
                                            placeholder='Others (please specify)' />
                                    </View>

                                    <TouchableOpacity style={styles.button2} onPress={() => setModalVisible(true)}>
                                        <Text style={styles.buttonText} >Submit</Text>
                                    </TouchableOpacity>

                                </>
                            )}

                        </View>
                    </View>

                </ScrollView >
                <BottomSheet
                    ref={bottomSheetRef}
                    index={-1}
                    snapPoints={snapPoints}
                    enablePanDownToClose
                >
                    <Text style={styles.sheetTitle}>Select Receiver</Text>
                    <TextInput
                        style={styles.searchBar}
                        placeholder='Search Receiver'
                        value={searchQuery}
                        onChangeText={setSearchQuery} />
                    <BottomSheetFlatList
                        data={receiverData}
                        keyExtractor={(item) => item.branch_receiver_id?.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.receiverItem}
                                onPress={() => handleReceiverSelect(item.branch_receiver_id, item.full_name)}
                            >
                                <Text style={styles.receiverText}>{item.full_name}</Text>
                                {selectedReceiver === item.full_name && (
                                    <Ionicons name="checkmark" size={20} color="green" />
                                )}
                            </TouchableOpacity>
                        )}
                        onEndReached={() => {
                            if (!isLoadingMore && hasMore) {
                                setPage(prev => prev + 1);
                                console.log("endreac");
                            }
                        }}
                        onEndReachedThreshold={0.5}
                        refreshing={isLoadingMore}
                        ListFooterComponent={
                            isLoadingMore ? (
                                <View style={{ padding: 50 }}>
                                    <ActivityIndicator size="small" color="#0000ff" />
                                </View>
                            ) : null
                        }
                    />
                </BottomSheet>
            </SafeAreaView>
        </SafeAreaProvider >
    );
}
const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalText: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    modalButton: {
        borderRadius: 10,
        padding: 10,
        minWidth: 100,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#ccc',
    },
    confirmButton: {
        backgroundColor: '#4CAF50',
    },
    modalButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
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
        marginVertical: 10,
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
        fontSize: 11,
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
        textAlign: 'center',
        alignSelf: 'center',
    },
    bodyColumn4: {
        width: '10%',
        /* marginLeft: 20 */
        marginLeft: 5,
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
        /*  fontWeight: 'bold', */
        fontSize: 12,
        fontWeight: 500,
        textAlign: 'center',
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
    expandedRemarks: {
        fontSize: 14,
        color: '#000',
        fontWeight: 500,
        textAlign: 'center',
    },
    expandedFooter: {
        backgroundColor: '#ffd33d',
        padding: 10,
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
    receiveView: {
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
        marginBottom: 5,
        position: 'relative',
    },
    receiverSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: 10,
        marginHorizontal: 20,
        marginVertical: 5,
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    receiverSelectorText: {
        fontSize: 16,
        color: '#333',
    },
    searchBar: {
        height: 45,
        width: '95%',
        alignSelf: 'center',
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 5,
        marginBottom: 10,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    receiverItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    receiverText: {
        fontSize: 14,
    },
});
