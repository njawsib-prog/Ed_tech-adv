import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

console.log('[ApiClient] Initializing with API_URL:', API_URL);
console.log('[ApiClient] NEXT_PUBLIC_API_URL env var:', process.env.NEXT_PUBLIC_API_URL);

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log('[ApiClient Request]', {
      url: `${config.baseURL}${config.url}`,
      method: config.method?.toUpperCase(),
      headers: config.headers,
      data: config.data,
      withCredentials: config.withCredentials,
      baseURL: config.baseURL
    });
    return config;
  },
  (error) => {
    console.error('[ApiClient Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log('[ApiClient Response Success]', {
      url: `${response.config.baseURL}${response.config.url}`,
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('[ApiClient Response Error]', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: error.config ? {
        url: `${error.config.baseURL}${error.config.url}`,
        method: error.config.method?.toUpperCase(),
        data: error.config.data
      } : null,
      isAxiosError: axios.isAxiosError(error),
      hasResponse: !!error.response,
      hasRequest: !!error.request
    });

    if (error.response?.status === 401) {
      // Redirect to login if not authenticated
      if (typeof window !== 'undefined') {
        console.log('[ApiClient] 401 Unauthorized, redirecting to login');
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/admin')) {
          window.location.href = '/admin/login';
        } else if (!currentPath.includes('/login')) {
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;