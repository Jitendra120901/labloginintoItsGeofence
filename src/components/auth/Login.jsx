// components/auth/Login.jsx - Simplified with basic lat/lng only
import React, { useState } from 'react';
import { useLocation } from '../hooks';
import { authAPI } from '../utilis';
import { Alert } from '../common';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  
  const { getLocation, isGettingLocation } = useLocation();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLocationStatus('Getting your location...');

    try {
      const location = await getLocation();
      
      setLocationStatus('Verifying location...');
      
      // Simple login with just lat/lng
      const response = await authAPI.login({
        ...formData,
        latitude: location.latitude,
        longitude: location.longitude
      });

      setLocationStatus('Login successful!');
      onLogin(response.user, response.token);
      
    } catch (err) {
      setError(err.message);
      setLocationStatus('');
      
      // Provide specific guidance for different error types
      if (err.message.includes('Access denied')) {
        setLocationStatus('You are outside the lab premises. Please move closer and try again.');
      } else if (err.message.includes('location')) {
        setLocationStatus('Please enable location services and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Login</h1>
        <p className="text-gray-600">Access Lab Management System</p>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your password"
          />
        </div>

        {/* Simple Location Status */}
        {(isGettingLocation || locationStatus) && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {isGettingLocation && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  {isGettingLocation ? 'Getting your location...' : locationStatus}
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || isGettingLocation}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {/* Simple info section */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Note: Lab employees can only login from within the lab premises
        </p>
      </div>
    </div>
  );
};

export default Login;