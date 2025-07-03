// components/auth/LabRegistration.jsx
import React, { useState } from 'react';
import { 
    EnvironmentOutlined as MapPin,
    SafetyOutlined as Shield,
    TeamOutlined as Users,
    EyeOutlined as Eye,
    EyeInvisibleOutlined as EyeOff
  } from '@ant-design/icons';
  
import { useLocation } from '../hooks';
import { authAPI, formatCoordinates } from '../utilis';
import { Alert, LoadingSpinner } from '../common';


const LabRegistration = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    registrationNumber: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    latitude: '',
    longitude: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { getLocation, isGettingLocation, locationError } = useLocation();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGetLocation = async () => {
    try {
      const location = await getLocation();
      const formatted = formatCoordinates(location.latitude, location.longitude);
      setFormData({
        ...formData,
        latitude: formatted.latitude,
        longitude: formatted.longitude
      });
      setError('');
    } catch (err) {
      setError(locationError || 'Unable to get location');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.registerLab(formData);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Registering lab..." />;
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lab Registration</h1>
        <p className="text-gray-600">Register your laboratory with geofence authentication</p>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {locationError && <Alert type="warning">{locationError}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lab Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Shield className="mr-2" size={20} />
            Lab Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lab Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ABC Medical Lab"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
              <input
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="LAB123456"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                rows="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123 Medical Street, City, State, ZIP"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lab Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="lab@abcmedical.com"
              />
            </div>
          </div>
        </div>

        {/* Admin Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="mr-2" size={20} />
            Lab Administrator Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Name *</label>
              <input
                type="text"
                name="adminName"
                value={formData.adminName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dr. John Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email *</label>
              <input
                type="email"
                name="adminEmail"
                value={formData.adminEmail}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@abcmedical.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleChange}
                  required
                  minLength="6"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <MapPin className="mr-2" size={20} />
            Geofence Location (20m radius)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude *</label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="40.712800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude *</label>
              <input
                type="number"
                step="any"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="-74.006000"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isGettingLocation}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <MapPin className="mr-2" size={16} />
              {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
            </button>
            <p className="text-sm text-gray-600 mt-2">
              A 20-meter geofence will be created around this location for employee authentication.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-green-600 text-white text-lg font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Registering Lab...' : 'Register Lab'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LabRegistration;