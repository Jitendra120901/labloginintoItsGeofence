// components/auth/Login.jsx - Enhanced with GPS accuracy handling
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
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  
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
      
      // Show GPS accuracy info
      setGpsAccuracy(location.accuracy);
      if (location.accuracy > 30) {
        setLocationStatus(`GPS accuracy: ${Math.round(location.accuracy)}m - May cause location issues`);
      } else {
        setLocationStatus(`GPS accuracy: ${Math.round(location.accuracy)}m - Good signal`);
      }

      // Attempt login
      setLocationStatus('Attempting login...');
      const response = await authAPI.login({
        ...formData,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy // Send GPS accuracy to backend
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

  const getGPSAccuracyColor = () => {
    if (!gpsAccuracy) return 'text-gray-600';
    if (gpsAccuracy <= 15) return 'text-green-600';
    if (gpsAccuracy <= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGPSAccuracyMessage = () => {
    if (!gpsAccuracy) return '';
    if (gpsAccuracy <= 15) return 'Excellent GPS signal';
    if (gpsAccuracy <= 30) return 'Good GPS signal';
    return 'Poor GPS signal - move to open area';
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

        {/* GPS Status Display */}
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
                  {isGettingLocation ? 'Getting your location for geofence verification...' : locationStatus}
                </p>
                {gpsAccuracy && (
                  <p className={`text-xs mt-1 ${getGPSAccuracyColor()}`}>
                    GPS Accuracy: {Math.round(gpsAccuracy)}m - {getGPSAccuracyMessage()}
                  </p>
                )}
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

      {/* Enhanced info section */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600 mb-2">
          Note: Lab employees can only login from within the lab premises
        </p>
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <p>💡 Tips for better GPS accuracy:</p>
          <ul className="text-left mt-1 space-y-1">
            <li>• Move to an open area</li>
            <li>• Enable high accuracy GPS</li>
            <li>• Wait for better signal if accuracy is poor</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;