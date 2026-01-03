import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

apiClient.defaults.xsrfCookieName = 'XSRF-TOKEN';
apiClient.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';
apiClient.defaults.withXSRFToken = true;

export default apiClient;