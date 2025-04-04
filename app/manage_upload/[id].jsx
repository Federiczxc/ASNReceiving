
import React, { useEffect, useState } from 'react';
import { View, Text, Button, Dimensions, Image, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { BlurView } from 'expo-blur';

import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import api from '../../api';
import { Ionicons } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox'

import Carousel from 'react-native-reanimated-carousel';
import { LogBox } from 'react-native';
import { Notifier, Easing } from 'react-native-notifier';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    const [tripBranch, setTripBranch] = useState({
        branch_name: '',
        branch_id: '',
    });
    const [uploadOutslip, setUploadOutslip] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [ocrText, setOcrText] = useState('');
    const { id } = useLocalSearchParams();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isExpanded2, setIsExpanded2] = useState(true);
    const [isExpandedItems, setIsExpandedItems] = useState({});

    const trip_ticket_detail_id = id;
    const [images, setImages] = useState([null]);
    const [ocrResults, setOcrResults] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [editableOcrText, setEditableOcrText] = useState(ocrText);
    const [removedImageIds, setRemovedImageIds] = useState([]);
    const [remarks, setRemarks] = useState([]);
    const toggleItemExpansion = (itemId) => {
        setIsExpandedItems(prev => (Object.assign(Object.assign({}, prev), { [itemId]: !prev[itemId] })));
    };
    useEffect(() => {
        setIsLoading(true);
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
                setTripBranch(response.data.branches[0]);
                setImages(uploadData.map(item => item.upload_files));
                setOcrResults(uploadData.map(item => item.upload_text));
                setRemarks(uploadData.map(item => item.upload_remarks));
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
    }, []);


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
                            <Text style={styles.tripId}>{outslipDetail.trans_name} #{outslipDetail.ref_trans_no}</Text>
                            <Text style={styles.tripId2}> Trip Ticket Detail ID #{outslipDetail.trip_ticket_detail_id}</Text>
                            <Text style={styles.tripId3}>Branch Name: {tripBranch.branch_name}</Text>
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
                                <View key={`${item.item_id}-${item.ref_trans_id}`}>
                                    <>
                                        <TouchableOpacity onPress={() => toggleItemExpansion(item.item_id)} activeOpacity={0.7}>

                                            <View style={styles.tableBody}>
                                                <View style={styles.bodyColumnPKG}>
                                                    <Checkbox
                                                        value={item.main_item === 1}
                                                        color={item.main_item === 1 ? '#4CAF50' : undefined}
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
                                        </TouchableOpacity>
                                    </>
                                    {

                                        isExpandedItems[item.item_id] && (
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
                                                                    <Text style={styles.expandedValue}>{serial.item_qty || 'N/A'}</Text>

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
                    </TouchableOpacity>
                    {isExpanded2 && (
                        <>
                            <Carousel
                                key={images.length}
                                loop={false}
                                width={Dimensions.get('window').width * 1}
                                height={Dimensions.get('window').height * 0.5}
                                data={uploadOutslip}
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
                                                value={remarks[currentIndex] || ''}
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
                                            {/* <TouchableOpacity onPress={() => pickImage(index)} activeOpacity={0.7} style={styles.imageCard}> */}
                                            <View style={styles.imageCard}>

                                                {images[index] ? (
                                                    <>
                                                        <Image source={{ uri: images[index] }} style={styles.image} />
                                                    </>
                                                ) : (
                                                    <Text style={styles.placeholder}>No image selected. Press to upload a picture</Text>
                                                )}
                                            </View>

                                            {/* </TouchableOpacity> */}
                                        </View>


                                        {/* Buttons Section */}
                                    </>
                                )} />
                            <View style={styles.paginationContainer}>
                                {images.map((_, i) => (
                                    <View key={i} style={[styles.dot, currentIndex === i ? styles.activeDot : null]} />
                                ))}
                            </View>
                        </>
                    )}

                </View>


            </View>

            {/* <View style={styles.buttonContainer}>
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
            </View> */}


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
    imageContainer: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 10,
        marginBottom: 20,
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
        marginVertical: 15
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
    },
    bodyColumn2: { // description
        width: '30%',
    },
    bodyColumn3: {
        width: '10%',
        alignContent: 'center',
    },
    bodyColumn4: {
        width: '10%',
        /* marginLeft: 20 */
    },

    bodyColumnPKG: {
        width: '10%',
        /* marginLeft: 20 */
    },
    bodyColumnCOMP: {
        width: '15%',
        /* marginLeft: 20 */
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
});
