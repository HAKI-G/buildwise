import axios from '../utils/axios';

// The global axios instance already has baseURL and interceptors configured
// Just export it for use in services
const api = axios;

export default api;
