import apiClient from './axios';

export const authAPI = {
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login/', credentials);
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post('/auth/register/', userData);
    return response.data;
  },

  logout: async (refreshToken) => {
    try {
      const response = await apiClient.post('/auth/logout/', { refresh: refreshToken });
      return response.data;
    } catch (e) {
      // Even if API call fails, local state should clear
      return { message: 'Logged out' };
    }
  },

  getProfile: async () => {
    const response = await apiClient.get('/auth/profile/');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await apiClient.patch('/auth/profile/', profileData);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await apiClient.post('/auth/change-password/', passwordData);
    return response.data;
  },
};

