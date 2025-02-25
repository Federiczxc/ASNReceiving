import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://176.16.1.126:8000/api';
//10.0.2.16
const api = axios.create({
    baseURL: API_URL,

});

export default api;