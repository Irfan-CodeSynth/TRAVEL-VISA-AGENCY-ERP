import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMeApi, loginApi, logoutApi } from '../services/auth.api';
import { useNavigate, useLocation } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatar?: string | null;
  branch?: { id: string; name: string } | null;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  login: (data: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }
      const profileData = await getMeApi();
      setUser(profileData);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (credentials: { email: string; password: string }) => {
    const data = await loginApi(credentials.email, credentials.password);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    // Load full profile (with permissions) after login
    const profileData = await getMeApi();
    setUser(profileData);
    navigate('/dashboard');
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    navigate('/login');
  };

  // Route guard
  useEffect(() => {
    if (!isLoading) {
      const path = location.pathname;
      const isPublicPath = path === '/login' || path === '/forgot-password' || path === '/reset-password';
      if (!user && !isPublicPath) {
        navigate('/login');
      } else if (user && isPublicPath) {
        navigate('/dashboard');
      }
    }
  }, [isLoading, user, location.pathname, navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        permissions: user?.permissions || [],
        login,
        logout,
      }}
    >
      {isLoading ? (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
