import axios from 'axios';

const API_URL = 'http://176.16.1.126:8000/api';
const api = axios.create({
    baseURL: API_URL,
    timeout: 10000,

});

export default api;