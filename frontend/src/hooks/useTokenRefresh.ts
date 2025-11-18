import { useContext } from 'react';
import AuthContext from '../contexts/JWTContext';

export const useTokenRefresh = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useTokenRefresh must be used within an AuthProvider');
  }

  return context.refreshToken;
};