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

  async refreshToken(): Promise<{ token: string }> {
    try {
      const response = await api({
        url: '/token/refresh',
        method: 'PATCH',
        withCredentials: true, // Include cookies for refresh token
      });
      return response.data;
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Token refresh failed';
      throw new Error(errorMessage);
    }
  }

  // Dashboard methods
  async getDashboardSummary(month?: string, year?: string): Promise<any> {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);

    const queryString = params.toString();
    const url = queryString ? `/dashboard/summary?${queryString}` : '/dashboard/summary';

    const response = await this.request<any>(url, 'GET');
    return response;
  }

  async getMonthlyFlow(year: string): Promise<any> {
    const response = await this.request<any>(`/dashboard/monthly-flow/${year}`, 'GET');
    return response;
  }

  async getExpensesByCategory(month: string, year: string): Promise<any> {
    const response = await this.request<any>(`/dashboard/expenses-by-category/${month}/${year}`, 'GET');
    return response;
  }
}

export const apiService = new ApiService();
export type { User, AuthResponse, SignUpData, SignInData };