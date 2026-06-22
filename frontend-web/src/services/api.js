/**
 * @fileoverview Axios API configuration with request/response interceptors.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: 'https://personal-doc-vault.vercel.app/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

let store;

/**
 * Injects the Redux store instance to resolve circular dependencies.
 * @param {object} _store - The configured Redux store instance.
 */
export const injectStore = (_store) => {
  store = _store;
};

// Request Interceptor: Attach access token
api.interceptors.request.use(
  (config) => {
    if (store) {
      const token = store.getState().auth.accessToken;
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-rotation on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && store) {
      originalRequest._retry = true;

      try {
        // Trigger refresh request
        const response = await axios.post(
          'http://localhost:5000/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        if (response.status === 200 && response.data?.success) {
          const newAccessToken = response.data.data.accessToken;

          // Dispatch update to Redux state
          store.dispatch({
            type: 'auth/refreshTokenSuccess',
            payload: newAccessToken
          });

          // Retry the original request
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Rotation failed, force logout cleanups
        store.dispatch({ type: 'auth/logout' });
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
