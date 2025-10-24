import { api } from '@/utils/api';

// Interface removida pois o backend retorna dados diretamente

interface SignUpData {
  name: string;
  email: string;
  password: string;
}

interface SignInData {
  email: string;
  password: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<T> {
    try {
      const response = await api({
        url: endpoint,
        method,
        data,
      });

      return response.data;
    } catch (error: any) {
      console.error('API request failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Request failed';
      throw new Error(errorMessage);
    }
  }

  async signUp(userData: SignUpData): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', 'POST', userData);
    return response; // Backend já retorna { user, token } diretamente
  }

  async signIn(credentials: SignInData): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', 'POST', credentials);
    return response; // Backend já retorna { user, token } diretamente
  }

  async getProfile(): Promise<User> {
    const response = await this.request<User>('/auth/profile', 'GET');
    return response; // Backend já retorna o user diretamente
  }
}

export const apiService = new ApiService();
export type { User, AuthResponse, SignUpData, SignInData };