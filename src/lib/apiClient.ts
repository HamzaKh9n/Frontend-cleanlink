import axios, { AxiosError } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "http://127.0.0.1:3000/api/v1";

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Error handling interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle network errors
    if (!error.response) {
      if (error.code === "ECONNABORTED") {
        error.message = "Request timeout. Please check your connection and try again.";
      } else if (error.message === "Network Error") {
        error.message = "Network error. Please check your internet connection.";
      } else {
        error.message = "Unable to connect to the server. Please try again later.";
      }
      return Promise.reject(error);
    }

    // Handle HTTP errors
    const status = error.response.status;
    const data = error.response.data as any;

    // Extract error message from response
    const errorMessage =
      data?.error?.message ||
      data?.message ||
      error.message ||
      "An unexpected error occurred";

    // Create a more user-friendly error
    const enhancedError = new Error(errorMessage);
    (enhancedError as any).response = error.response;
    (enhancedError as any).status = status;
    (enhancedError as any).code = data?.error?.code;

    // Handle specific status codes
    if (status === 401) {
      // Unauthorized - token might be expired or user not logged in
      // This is expected for unauthenticated requests, don't log as error
      (enhancedError as any).isUnauthorized = true;
      // Suppress console errors for 401 - they're expected when user is not logged in
      // The error will still be available to components for handling
    } else if (status === 403) {
      (enhancedError as any).isForbidden = true;
    } else if (status === 404) {
      (enhancedError as any).isNotFound = true;
    } else if (status === 503) {
      // Service Unavailable - backend might be down or database unavailable
      (enhancedError as any).isServerError = true;
      (enhancedError as any).message = "Service temporarily unavailable. Please try again later.";
    } else if (status >= 500) {
      (enhancedError as any).isServerError = true;
    }

    return Promise.reject(enhancedError);
  }
);

export default apiClient;

