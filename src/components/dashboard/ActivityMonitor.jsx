// components/dashboard/ActivityMonitor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    LineChartOutlined as Activity,
    FilterOutlined as Filter,
    EnvironmentOutlined as MapIcon
  } from '@ant-design/icons';
import { 
  loadGoogleMapsAPI, 
  createMarker, 
  createInfoWindow, 
  createGeofenceCircle, 
  handleMapsError,
  resetGoogleMapsAPI 
} from '../utilis/googleMapsUtils';

const ActivityMonitor = ({ loginAttempts, employees, labLocation }) => {
  const [filters, setFilters] = useState({
    dateRange: 'today',
    status: 'all',
    employeeId: 'all'
  });
  const [showMap, setShowMap] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  // Load Google Maps when map is toggled
  useEffect(() => {
    if (showMap && !mapInstance.current && mapRef.current) {
      // Add a small delay to ensure the DOM element is fully rendered
      const timer = setTimeout(() => {
        initializeMap();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showMap]);

  // Reinitialize map when filters change
  useEffect(() => {
    if (showMap && mapInstance.current) {
      clearMapMarkers();
      addMarkersToMap();
    }
  }, [filters, loginAttempts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current && mapInstance.current.loginMarkers) {
        clearMapMarkers();
      }
    };
  }, []);

  const initializeMap = async () => {
    if (!mapRef.current) {
      console.warn('Map container not ready');
      return;
    }

    setMapLoading(true);
    setMapError(null);

    try {
      // Load Google Maps API
      await loadGoogleMapsAPI();

      // Double-check that the map container still exists
      if (!mapRef.current) {
        throw new Error('Map container became unavailable');
      }

      const defaultCenter = labLocation || { lat: 28.6139, lng: 77.2090 };

      // Create map instance
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        center: defaultCenter,
        mapTypeId: 'roadmap',
        gestureHandling: 'cooperative',
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Wait for map to be ready
      await new Promise(resolve => {
        const listener = mapInstance.current.addListener('idle', () => {
          window.google.maps.event.removeListener(listener);
          resolve();
        });
      });

      // Add lab location and geofence
      if (labLocation) {
        // Lab marker
        const labMarker = createMarker({
          map: mapInstance.current,
          position: labLocation,
          title: 'Lab Location',
          color: '#4F46E5',
          size: 12
        });

        // Lab info window
        const labInfoWindow = createInfoWindow({
          title: 'Lab Location',
          content: [
            { label: 'Type', value: 'Main Laboratory' },
            { label: 'Geofence Radius', value: '100 meters' }
          ]
        });

        // Add click listener for lab marker
        if (labMarker.addListener) {
          labMarker.addListener('click', () => {
            labInfoWindow.open(mapInstance.current, labMarker);
          });
        }

        // Add geofence circle
        createGeofenceCircle({
          map: mapInstance.current,
          center: labLocation,
          radius: 100,
          color: '#4F46E5'
        });
      }

      // Add login attempt markers
      addMarkersToMap();
      
      setMapLoading(false);
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError(handleMapsError(error));
      setMapLoading(false);
    }
  };

  const clearMapMarkers = () => {
    // Store markers in a property so we can clear them
    if (mapInstance.current && mapInstance.current.loginMarkers) {
      mapInstance.current.loginMarkers.forEach(marker => {
        if (marker.setMap) {
          marker.setMap(null);
        }
      });
      mapInstance.current.loginMarkers = [];
    }
  };

  const addMarkersToMap = () => {
    if (!mapInstance.current) return;

    // Initialize markers array if not exists
    if (!mapInstance.current.loginMarkers) {
      mapInstance.current.loginMarkers = [];
    }

    const filteredAttempts = getFilteredAttempts();
    
    filteredAttempts.forEach((attempt) => {
      if (attempt.attemptLocation?.latitude && attempt.attemptLocation?.longitude) {
        const position = {
          lat: attempt.attemptLocation.latitude,
          lng: attempt.attemptLocation.longitude
        };

        // Create marker
        const marker = createMarker({
          map: mapInstance.current,
          position: position,
          title: `${attempt.userId?.name || 'Unknown'} - ${attempt.isSuccessful ? 'Success' : 'Failed'}`,
          color: attempt.isSuccessful ? '#10B981' : '#EF4444',
          size: 8
        });

        // Create info window content
        const infoContent = [
          { label: 'Status', value: attempt.isSuccessful ? 'Success' : 'Failed' },
          { label: 'Time', value: new Date(attempt.timestamp).toLocaleString() },
          { label: 'Distance', value: `${attempt.distanceFromLab}m` },
          { label: 'Within Geofence', value: attempt.isWithinGeofence ? 'Yes' : 'No' }
        ];

        if (!attempt.isSuccessful) {
          infoContent.push({ label: 'Failure Reason', value: getFailureReason(attempt) });
        }

        const infoWindow = createInfoWindow({
          title: attempt.userId?.name || 'Unknown User',
          content: infoContent
        });

        // Add click listener
        if (marker.addListener) {
          marker.addListener('click', () => {
            // Close other info windows
            if (mapInstance.current.openInfoWindow) {
              mapInstance.current.openInfoWindow.close();
            }
            infoWindow.open(mapInstance.current, marker);
            mapInstance.current.openInfoWindow = infoWindow;
          });
        }

        // Store marker for cleanup
        mapInstance.current.loginMarkers.push(marker);
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
      // Status filter
      if (filters.status === 'success' && !attempt.isSuccessful) return false;
      if (filters.status === 'failed' && attempt.isSuccessful) return false;
      if (filters.status === 'geofence' && attempt.isWithinGeofence) return false;
      
      // Employee filter
      if (filters.employeeId !== 'all' && attempt.userId?._id !== filters.employeeId) return false;
      
      // Date filter (simplified - you can enhance this)
      const attemptDate = new Date(attempt.timestamp);
      const now = new Date();
      
      if (filters.dateRange === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (attemptDate < today) return false;
      } else if (filters.dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        if (attemptDate < weekAgo) return false;
      } else if (filters.dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        if (attemptDate < monthAgo) return false;
      }
      
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
    if (attempt.attemptLocation?.latitude && attempt.attemptLocation?.longitude && mapInstance.current) {
      setShowMap(true);
      
      // Center map on the selected attempt
      setTimeout(() => {
        if (mapInstance.current) {
          const position = {
            lat: attempt.attemptLocation.latitude,
            lng: attempt.attemptLocation.longitude
          };
          mapInstance.current.setCenter(position);
          mapInstance.current.setZoom(15);
        }
      }, 300);
    }
  };

  const handleRetryMap = () => {
    setMapError(null);
    setMapLoading(false);
    mapInstance.current = null;
    
    // Reset Google Maps API completely
    resetGoogleMapsAPI();
    
    if (showMap && mapRef.current) {
      // Small delay to ensure cleanup is complete
      setTimeout(() => {
        initializeMap();
      }, 500);
    }
  };

  const filteredAttempts = getFilteredAttempts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Login Activity</h2>
        <button
          onClick={() => setShowMap(!showMap)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
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
              Blue circle shows lab location and geofence. Green markers are successful logins, red markers are failed attempts. Click markers for details.
            </p>
          </div>
          
          {mapError ? (
            <div className="p-6 text-center">
              <div className="text-red-600 mb-2">⚠️ Map Error</div>
              <p className="text-sm text-gray-600 mb-4">{mapError}</p>
              <button 
                onClick={handleRetryMap}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Retry Loading Map
              </button>
            </div>
          ) : mapLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading Google Maps...</p>
            </div>
          ) : (
            <div 
              ref={mapRef}
              style={{ height: '400px', width: '100%' }}
              className="bg-gray-100"
            />
          )}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
          <div className="overflow-x-auto">
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
                {filteredAttempts.map((attempt) => (
                  <tr 
                    key={attempt._id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(attempt)}
                    title="Click to view on map"
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
          </div>
        )}
      </div>

      {/* Activity Summary */}
      {loginAttempts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Activity Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{filteredAttempts.length}</p>
              <p className="text-sm text-gray-600">Total Attempts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {filteredAttempts.filter(attempt => attempt.isSuccessful).length}
              </p>
              <p className="text-sm text-gray-600">Successful</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {filteredAttempts.filter(attempt => !attempt.isSuccessful).length}
              </p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {filteredAttempts.filter(attempt => !attempt.isWithinGeofence).length}
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