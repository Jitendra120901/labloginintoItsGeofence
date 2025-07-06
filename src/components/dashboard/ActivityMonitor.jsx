// components/dashboard/ActivityMonitor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    LineChartOutlined as Activity,
    FilterOutlined as Filter,
    EnvironmentOutlined as MapIcon
  } from '@ant-design/icons';

const ActivityMonitor = ({ loginAttempts, employees, labLocation }) => {
  const [filters, setFilters] = useState({
    dateRange: 'today',
    status: 'all',
    employeeId: 'all'
  });
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  // Initialize Google Maps
  useEffect(() => {
    if (showMap && !mapInstance.current) {
      initializeMap();
    }
  }, [showMap, selectedAttempt]);

  const initializeMap = () => {
    if (!window.google || !mapRef.current) return;

    const defaultCenter = labLocation || { lat: 28.6139, lng: 77.2090 }; // Default to Delhi

    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      zoom: 12,
      center: defaultCenter,
      mapTypeId: 'roadmap'
    });

    // Add lab location marker
    if (labLocation) {
      new window.google.maps.Marker({
        position: labLocation,
        map: mapInstance.current,
        title: 'Lab Location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4F46E5',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        }
      });

      // Add geofence circle
      new window.google.maps.Circle({
        strokeColor: '#4F46E5',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#4F46E5',
        fillOpacity: 0.15,
        map: mapInstance.current,
        center: labLocation,
        radius: 100 // 100 meters radius, adjust as needed
      });
    }

    // Add login attempt markers
    const filteredAttempts = getFilteredAttempts();
    filteredAttempts.forEach((attempt, index) => {
      if (attempt.attemptLocation?.latitude && attempt.attemptLocation?.longitude) {
        const marker = new window.google.maps.Marker({
          position: {
            lat: attempt.attemptLocation.latitude,
            lng: attempt.attemptLocation.longitude
          },
          map: mapInstance.current,
          title: `${attempt.userId?.name || 'Unknown'} - ${attempt.isSuccessful ? 'Success' : 'Failed'}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: attempt.isSuccessful ? '#10B981' : '#EF4444',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2
          }
        });

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h4 style="margin: 0 0 8px 0; font-weight: 600;">${attempt.userId?.name || 'Unknown'}</h4>
              <p style="margin: 4px 0; font-size: 14px;">
                <strong>Status:</strong> ${attempt.isSuccessful ? 'Success' : 'Failed'}
              </p>
              <p style="margin: 4px 0; font-size: 14px;">
                <strong>Time:</strong> ${new Date(attempt.timestamp).toLocaleString()}
              </p>
              <p style="margin: 4px 0; font-size: 14px;">
                <strong>Distance:</strong> ${attempt.distanceFromLab}m
              </p>
              ${!attempt.isSuccessful ? `
                <p style="margin: 4px 0; font-size: 14px;">
                  <strong>Reason:</strong> ${getFailureReason(attempt)}
                </p>
              ` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstance.current, marker);
        });
      }
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const getFilteredAttempts = () => {
    return loginAttempts.filter(attempt => {
      // Apply filters here based on current filter state
      if (filters.status === 'success' && !attempt.isSuccessful) return false;
      if (filters.status === 'failed' && attempt.isSuccessful) return false;
      if (filters.status === 'geofence' && attempt.isWithinGeofence) return false;
      if (filters.employeeId !== 'all' && attempt.userId?._id !== filters.employeeId) return false;
      
      // Add date filtering logic here
      
      return true;
    });
  };

  const getStatusBadge = (attempt) => {
    if (attempt.isSuccessful) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Success</span>;
    }
    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Failed</span>;
  };

  const getFailureReason = (attempt) => {
    if (attempt.isSuccessful) return 'N/A';
    
    const reasons = {
      'invalid_credentials': 'Invalid Credentials',
      'outside_geofence': 'Outside Geofence',
      'account_inactive': 'Account Inactive'
    };
    
    return reasons[attempt.failureReason] || attempt.failureReason || 'Unknown';
  };

  const handleRowClick = (attempt) => {
    setSelectedAttempt(attempt);
    if (attempt.attemptLocation?.latitude && attempt.attemptLocation?.longitude) {
      setShowMap(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Login Activity</h2>
        <button
          onClick={() => setShowMap(!showMap)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <MapIcon className="mr-2" size={16} />
          {showMap ? 'Hide Map' : 'Show Map'}
        </button>
      </div>

      {/* Google Map */}
      {showMap && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Login Attempts Map</h3>
            <p className="text-sm text-gray-600 mt-1">
              Blue circle shows lab location and geofence. Green markers are successful logins, red markers are failed attempts.
            </p>
          </div>
          <div 
            ref={mapRef}
            style={{ height: '400px', width: '100%' }}
            className="bg-gray-100"
          />
        </div>
      )}
      
      {/* Activity Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Filter className="mr-2" size={20} />
          <h3 className="text-lg font-semibold">Activity Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select 
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All attempts</option>
              <option value="success">Successful only</option>
              <option value="failed">Failed only</option>
              <option value="geofence">Geofence violations</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select 
              value={filters.employeeId}
              onChange={(e) => handleFilterChange('employeeId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All employees</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loginAttempts.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No login attempts yet</h3>
            <p className="text-gray-500">Login activity will appear here once employees start logging in</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredAttempts().map((attempt) => (
                <tr 
                  key={attempt._id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleRowClick(attempt)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-medium">
                          {attempt.userId?.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {attempt.userId?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {attempt.userId?.email || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(attempt.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(attempt.timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(attempt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {attempt.distanceFromLab}m
                    </div>
                    <div className="text-sm text-gray-500">
                      {attempt.isWithinGeofence ? 'Within bounds' : 'Outside bounds'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getFailureReason(attempt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      Lat: {attempt.attemptLocation?.latitude?.toFixed(4) || 'N/A'}
                    </div>
                    <div>
                      Lng: {attempt.attemptLocation?.longitude?.toFixed(4) || 'N/A'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Activity Summary */}
      {loginAttempts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Activity Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{getFilteredAttempts().length}</p>
              <p className="text-sm text-gray-600">Total Attempts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {getFilteredAttempts().filter(attempt => attempt.isSuccessful).length}
              </p>
              <p className="text-sm text-gray-600">Successful</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {getFilteredAttempts().filter(attempt => !attempt.isSuccessful).length}
              </p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {getFilteredAttempts().filter(attempt => !attempt.isWithinGeofence).length}
              </p>
              <p className="text-sm text-gray-600">Geofence Violations</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityMonitor;