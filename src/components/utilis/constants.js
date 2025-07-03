// utils/constants.js
export const API_BASE_URL = 'http://localhost:4000/api';

export const USER_ROLES = {
  LAB_ADMIN: 'lab_admin',
  LAB_EMPLOYEE: 'lab_employee'
};

export const LOGIN_ATTEMPT_STATUS = {
  SUCCESS: 'success',
  FAILED: 'failed',
  GEOFENCE_VIOLATION: 'geofence_violation'
};

export const GEOFENCE_RADIUS = 20; // meters

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user'
};

export const PAGES = {
  LOGIN: 'login',
  REGISTER: 'register',
  DASHBOARD: 'dashboard'
};

export const DASHBOARD_TABS = {
  OVERVIEW: 'overview',
  EMPLOYEES: 'employees',
  ACTIVITY: 'activity'
};