import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';
import { setAccessToken } from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session on initial mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('jobtrack_user');
      const storedAccessToken = localStorage.getItem('jobtrack_access_token');
      const storedRefreshToken = localStorage.getItem('jobtrack_refresh_token');

      if (storedAccessToken && storedUser && storedRefreshToken) {
        try {
          setUser(JSON.parse(storedUser));
          setAccessToken(storedAccessToken);
          // Silently verify user profile with backend
          const profile = await authAPI.getProfile();
          setUser(profile);
          localStorage.setItem('jobtrack_user', JSON.stringify(profile));
        } catch (err) {
          // If profile fetch fails and refresh fails, state is cleared by axios interceptor
          console.warn('Initial session validation failed or token expired.');
        }
      }
      setLoading(false);
    };

    initializeAuth();

    // Listen for auth expiration events emitted by Axios interceptor
    const handleAuthExpired = () => {
      setUser(null);
      setAccessToken(null);
      toast.error('Session expired. Please sign in again.');
    };

    window.addEventListener('jobtrack:auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('jobtrack:auth-expired', handleAuthExpired);
    };
  }, []);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    try {
      const data = await authAPI.login({ username, password });
      setAccessToken(data.access);
      localStorage.setItem('jobtrack_refresh_token', data.refresh);
      localStorage.setItem('jobtrack_user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.first_name || data.user.username}!`);
      return { success: true };
    } catch (error) {
      let message = 'Unable to sign in. Please verify your credentials.';
      if (error.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error.response?.data?.non_field_errors) {
        message = error.response.data.non_field_errors[0];
      }
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (registrationData) => {
    setLoading(true);
    try {
      const data = await authAPI.register(registrationData);
      setAccessToken(data.access);
      localStorage.setItem('jobtrack_refresh_token', data.refresh);
      localStorage.setItem('jobtrack_user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success('Account created successfully! Welcome to JobTrack.');
      return { success: true };
    } catch (error) {
      const errorData = error.response?.data || {};
      let firstErrorMessage = 'Registration failed. Please check the form.';
      
      // Extract the first field validation error message
      for (const field of Object.keys(errorData)) {
        if (Array.isArray(errorData[field]) && errorData[field].length > 0) {
          firstErrorMessage = `${field}: ${errorData[field][0]}`;
          break;
        } else if (typeof errorData[field] === 'string') {
          firstErrorMessage = errorData[field];
          break;
        }
      }
      
      toast.error(firstErrorMessage);
      return { success: false, fieldErrors: errorData, error: firstErrorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('jobtrack_refresh_token');
    if (refreshToken) {
      await authAPI.logout(refreshToken);
    }
    setAccessToken(null);
    localStorage.removeItem('jobtrack_refresh_token');
    localStorage.removeItem('jobtrack_user');
    setUser(null);
    toast.success('Signed out successfully.');
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    try {
      const updatedUser = await authAPI.updateProfile(profileData);
      setUser(updatedUser);
      localStorage.setItem('jobtrack_user', JSON.stringify(updatedUser));
      toast.success('Profile updated successfully.');
      return { success: true, user: updatedUser };
    } catch (error) {
      const errorData = error.response?.data || {};
      let message = 'Failed to update profile.';
      if (errorData.email) message = errorData.email[0];
      toast.error(message);
      return { success: false, error: message };
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        updateProfile,
      }}
    >
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

