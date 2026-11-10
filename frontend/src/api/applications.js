import apiClient from './axios';

export const applicationsAPI = {
  getApplications: async (params = {}) => {
    const response = await apiClient.get('/applications/', { params });
    return response.data;
  },

  getApplication: async (id) => {
    const response = await apiClient.get(`/applications/${id}/`);
    return response.data;
  },

  createApplication: async (applicationData) => {
    const response = await apiClient.post('/applications/', applicationData);
    return response.data;
  },

  updateApplication: async (id, applicationData) => {
    const response = await apiClient.patch(`/applications/${id}/`, applicationData);
    return response.data;
  },

  deleteApplication: async (id) => {
    const response = await apiClient.delete(`/applications/${id}/`);
    return response.data;
  },

  getApplicationActivities: async (id) => {
    const response = await apiClient.get(`/applications/${id}/activities/`);
    return response.data;
  },

  getDashboardStats: async () => {
    const response = await apiClient.get('/applications/stats/');
    return response.data;
  },
};

