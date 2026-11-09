import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('eventhub_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('eventhub_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate session against backend on startup
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('eventhub_token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem('eventhub_user', JSON.stringify(res.user));
          }
        } catch (err) {
          // Token expired or invalid
          localStorage.removeItem('eventhub_token');
          localStorage.removeItem('eventhub_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success && res.token) {
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('eventhub_token', res.token);
      localStorage.setItem('eventhub_user', JSON.stringify(res.user));
    }
    return res;
  };

  const register = async (payload) => {
    const res = await authService.register(payload);
    if (res.success && res.token) {
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('eventhub_token', res.token);
      localStorage.setItem('eventhub_user', JSON.stringify(res.user));
    }
    return res;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      // Ignore network errors on logout
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('eventhub_token');
    localStorage.removeItem('eventhub_user');
  };

  const updateProfile = async (updatedData) => {
    const res = await authService.updateProfile(updatedData);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem('eventhub_user', JSON.stringify(res.user));
    }
    return res;
  };

  // Quick switch role utility by authenticating against the real seeded accounts!
  const switchDemoRole = async (roleKey) => {
    try {
      let email = 'sarah.j@gmail.com';
      if (roleKey === 'ADMIN') email = 'admin@eventhub.com';
      if (roleKey === 'ORGANIZER') email = 'elena@novatech.io';

      await login(email, 'password123');
    } catch (err) {
      console.error('Role switch error:', err);
    }
  };

  const roleName = user?.role?.name || (typeof user?.role === 'string' ? user.role : null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: roleName,
        loading,
        isAuthenticated: !!user,
        isAdmin: roleName === 'ADMIN',
        isOrganizer: roleName === 'ORGANIZER',
        isUser: roleName === 'ATTENDEE' || roleName === 'USER',
        login,
        register,
        logout,
        updateProfile,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
