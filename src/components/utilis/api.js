// utils/api.js
import { API_BASE_URL, STORAGE_KEYS } from './constants';

export const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }
  
  return data;
};

// Auth API calls
export const authAPI = {
  registerLab: (labData) => apiCall('/auth/register-lab', {
    method: 'POST',
    body: JSON.stringify(labData)
  }),
  
  login: (credentials) => apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  
  getProfile: () => apiCall('/auth/profile')
};

// Users API calls
export const usersAPI = {
  createEmployee: (employeeData) => apiCall('/users/create-employee', {
    method: 'POST',
    body: JSON.stringify(employeeData)
  }),
  
  getEmployees: () => apiCall('/users/employees'),
  
  updateEmployee: (id, employeeData) => apiCall(`/users/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(employeeData)
  }),
  
  deleteEmployee: (id) => apiCall(`/users/employees/${id}`, {
    method: 'DELETE'
  }),
  
  getLoginAttempts: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiCall(`/users/login-attempts${queryString ? `?${queryString}` : ''}`);
  }
};

// Dashboard API calls
export const dashboardAPI = {
  getStats: () => apiCall('/dashboard/stats'),
  getLabInfo: () => apiCall('/dashboard/lab-info')
};