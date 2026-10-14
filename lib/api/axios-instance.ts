import axios from 'axios';

const SPRING_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

/** Browser HTTPS pages cannot call http:// catalog hosts (mixed content). Proxy instead. */
export function catalogBaseUrl() {
  if (typeof window === 'undefined') return SPRING_BASE;
  if (window.location.protocol === 'https:' && SPRING_BASE.startsWith('http://')) {
    return `${window.location.origin}/api/backend`;
  }
  return SPRING_BASE;
}

const apiClient = axios.create({
  baseURL: catalogBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    config.baseURL = catalogBaseUrl();
    const token = process.env.NEXT_PUBLIC_API_BEARER_TOKEN;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default apiClient;
