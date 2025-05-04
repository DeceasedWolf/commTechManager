import axios, { AxiosResponse } from 'axios';

// Set a default timeout
const DEFAULT_TIMEOUT = 10000;

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
    withCredentials: true,
    timeout: DEFAULT_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add request interceptor for debugging
api.interceptors.request.use(
    config => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
        // Add a timestamp to prevent caching issues
        const separator = config.url?.includes('?') ? '&' : '?';
        config.url = `${config.url}${separator}_ts=${new Date().getTime()}`;
        return config;
    },
    error => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for debugging
api.interceptors.response.use(
    response => {
        console.log(`API Response (${response.status}): ${response.config.method?.toUpperCase()} ${response.config.url}`, 
            response.data || '');
        return response;
    },
    error => {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error(`API Error ${error.response.status}: ${error.config.method?.toUpperCase()} ${error.config.url}`, 
                error.response.data);
            
            // Special handling for authentication errors
            if (error.response.status === 401) {
                console.error('Authentication error - user not authenticated');
            } else if (error.response.status === 403) {
                console.error('Authorization error - user not authorized');
            }
        } else if (error.request) {
            // The request was made but no response was received
            console.error('API No Response Error:', error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('API Setup Error:', error.message);
        }
        
        return Promise.reject(error);
    }
);

export default api;

// Helper function to make API calls with retries
export const apiWithRetry = async (
    method: string, 
    url: string, 
    data?: any, 
    retries = 2, 
    retryDelay = 1000
): Promise<AxiosResponse<any>> => {
    try {
        if (method === 'get') {
            return await api.get(url);
        } else if (method === 'post') {
            return await api.post(url, data);
        } else if (method === 'put') {
            return await api.put(url, data);
        } else if (method === 'delete') {
            return await api.delete(url, { data });
        }
        throw new Error(`Unsupported HTTP method: ${method}`);
    } catch (error) {
        if (retries > 0) {
            console.log(`Retrying ${method} ${url} - ${retries} retries left`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return apiWithRetry(method, url, data, retries - 1, retryDelay * 2);
        }
        throw error;
    }
};
