import { createContext, useState, useEffect, type ReactNode } from "react";
import { apiService, type User } from "../utils/api";
import { setAccessToken } from "../utils/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // O access token vive só em memória; ao recarregar a página, a sessão é
    // restaurada pelo refresh token no cookie httpOnly.
    const initializeAuth = async () => {
      try {
        const { token } = await apiService.refreshToken();
        setAccessToken(token);
        const userData = await apiService.getProfile();
        setUser(userData);
      } catch {
        // Sem sessão ativa (cookie ausente, expirado ou revogado)
        setAccessToken(null);
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { user: userData, token } = await apiService.signIn({ email, password });

      setUser(userData);
      setAccessToken(token);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const { user: userData, token } = await apiService.signUp({ name, email, password });

      setUser(userData);
      setAccessToken(token);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    // Revoga o refresh token no servidor e limpa o cookie
    await apiService.logout();
    setUser(null);
    setAccessToken(null);
  };

  const refreshToken = async (): Promise<string | null> => {
    try {
      const { token } = await apiService.refreshToken();
      setAccessToken(token);
      return token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      signOut(); // Auto logout if refresh fails
      return null;
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    refreshToken,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
