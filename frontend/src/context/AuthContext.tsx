import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (userData: { email: string; password: string; full_name: string; phone?: string; role?: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('smartpark_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('smartpark_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('smartpark_token');
      if (storedToken) {
        try {
          const profile = await authApi.getProfile();
          setUser(profile);
          localStorage.setItem('smartpark_user', JSON.stringify(profile));
        } catch {
          localStorage.removeItem('smartpark_token');
          localStorage.removeItem('smartpark_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const data = await authApi.login(credentials);
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('smartpark_token', data.access_token);
    localStorage.setItem('smartpark_user', JSON.stringify(data.user));
  };

  const register = async (userData: { email: string; password: string; full_name: string; phone?: string; role?: string }) => {
    await authApi.register(userData);
    // Auto login right after registration
    await login({ email: userData.email, password: userData.password });
  };

  const logout = () => {
    localStorage.removeItem('smartpark_token');
    localStorage.removeItem('smartpark_user');
    setUser(null);
    setToken(null);
  };

  const refreshProfile = async () => {
    if (token) {
      const profile = await authApi.getProfile();
      setUser(profile);
      localStorage.setItem('smartpark_user', JSON.stringify(profile));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
