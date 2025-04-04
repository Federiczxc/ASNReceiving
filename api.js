import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import router from 'expo-router';
//const API_URL = 'http://176.16.1.126:8000/api';
const API_URL = 'http://winterpinegroup.com.ph:8000/api';
//10.0.2.16
const api = axios.create({
    baseURL: API_URL,

});
/* api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;
        if (error.response.status === 401 && !originalRequest._isRetry){
            Alert.alert(
                'Session Expired',
                'Your session has expired. Please login again.',
                [
                    {
                        text: 'OK',
                        onPress: async () => {
                            // Clear all stored credentials
                            await AsyncStorage.multiRemove([
                                'access_token',
                                'refresh_token',
                                'user_data'
                            ]);
                            // Redirect to login screen
                            router.replace('/app/index.tsx');
                        }
                    }
                ],
                { cancelable: false }
            );
            
            // Mark this request to prevent infinite loops
            originalRequest._isRetry = true;
        }
        
        return Promise.reject(error);
    }
); */
export default api;