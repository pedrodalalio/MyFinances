import axios from 'axios';

// Access token mantido apenas em memória (nunca em localStorage, para não
// ficar exposto a XSS). A sessão persiste pelo refresh token em cookie
// httpOnly: ao recarregar a página, o AuthProvider chama /token/refresh para
// obter um novo access token.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// Configuração base do axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  withCredentials: true, // Include cookies for refresh token
});

const REFRESH_URL = '/token/refresh';

// Variable to track if we're currently refreshing token to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Interceptor para adicionar o token automaticamente
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Interceptor para tratar erros de resposta e renovar token automaticamente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Falha do próprio refresh nunca dispara outro refresh (evita loop)
    if (originalRequest?.url === REFRESH_URL) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint directly to avoid circular dependency
        const refreshResponse = await api({
          url: REFRESH_URL,
          method: 'PATCH',
          withCredentials: true,
        });
        const { token } = refreshResponse.data;
        setAccessToken(token);
        processQueue(null, token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/sign-in';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export { api };
