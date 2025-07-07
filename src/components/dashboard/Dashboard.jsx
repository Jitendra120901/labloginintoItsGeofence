// components/dashboard/Dashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DASHBOARD_TABS, dashboardAPI, usersAPI, authAPI, STORAGE_KEYS } from '../utilis';
import { useLocation } from '../hooks';
import { Alert, LoadingSpinner } from '../common';
import Overview from './Overview';
import EmployeeManagement from './EmployeeManagement';
import ActivityMonitor from './ActivityMonitor';
import Header from './Header';
import Navigation from './Navigation';

// Lab 404 Component for when user is outside geofence
const LabNotFoundPage = ({ labInfo, onRetryLocation, isChecking }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          {/* Lab Icon */}
          <div className="mx-auto h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          
          {/* Error Code */}
          <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
          
          {/* Main Message */}
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Lab Not Found
          </h2>
          
          {/* Description */}
          <p className="text-gray-600 mb-6">
            You are currently outside the lab premises. Please return to{' '}
            <span className="font-semibold text-blue-600">
              {labInfo?.name || 'your assigned lab'}
            </span>{' '}
            to access the dashboard.
          </p>
          
          {/* Location Icon */}
          <div className="flex items-center justify-center mb-6">
            <svg className="h-8 w-8 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm text-gray-500">Location verification required</span>
          </div>
          
          {/* Retry Button */}
          <button
            onClick={onRetryLocation}
            disabled={isChecking}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking Location...
              </>
            ) : (
              'Check Location Again'
            )}
          </button>
          
          {/* Help Text */}
          <div className="mt-6 text-xs text-gray-500">
            <p>Make sure you are physically present in the lab premises</p>
            <p>and have location services enabled in your browser.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(DASHBOARD_TABS.OVERVIEW);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [labInfo, setLabInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Location verification states
  const [loginLocation, setLoginLocation] = useState(null); // User's login location (reference point)
  const [locationCheckError, setLocationCheckError] = useState('');
  const [isLocationChecking, setIsLocationChecking] = useState(false);
  const [isWithinGeofence, setIsWithinGeofence] = useState(true); // New state for geofence
  const [locationData, setLocationData] = useState(null); // Store location response data
  const [initialLocationCaptured, setInitialLocationCaptured] = useState(false); // Prevent multiple initial calls
  const intervalRef = useRef(null);
  
  const { getLocation } = useLocation();

  // Debug: Log state changes
  useEffect(() => {
    console.log("🔄 isWithinGeofence state changed to:", isWithinGeofence);
  }, [isWithinGeofence]);

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in meters
    return distance;
  };

  // Optimized verifyLocationWithBackend function with distance pre-check using localStorage
  const verifyLocationWithBackend = useCallback(async (currentLocation, isInitialLogin = false) => {
    
    // Always get the stored location from localStorage
    let storedLocation = null;
    try {
      const location = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCATION));
      storedLocation = location;
      console.log("Stored location from localStorage:", storedLocation);
    } catch (error) {
      console.error("Error reading stored location:", error);
    }
    
    // Check if we have a stored location to compare with (skip for initial login)
    if (storedLocation && !isInitialLogin) {
      console.log("Stored location:", storedLocation);
      console.log("Current location:", currentLocation);
      
      // Calculate distance between stored location and current location
      const distanceFromStored = calculateDistance(
        storedLocation.latitude,
        storedLocation.longitude,
        currentLocation.latitude,
        currentLocation.longitude
      );
      
      console.log(`Distance from stored location: ${distanceFromStored.toFixed(2)} meters`);
      
      // If distance is less than 15 meters from stored location, skip API call
      if (distanceFromStored < 15) {
        console.log("Distance is less than 15 meters from stored location - skipping API call");
        console.log("Maintaining current geofence status");
        
        // Return current geofence status without API call
        return isWithinGeofence;
      }
      
      console.log("Distance is >= 15 meters from stored location - proceeding with API call");
    } else if (!isInitialLogin && !storedLocation) {
      console.log("No stored location found - this shouldn't happen after initial login");
    } else {
      console.log("Initial login - proceeding with API call to establish stored location");
    }
    
    try {
      console.log("Making API call to authAPI.verifyUserLocation...");
      const response = await authAPI.verifyUserLocation({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        userId: user.id
      });
      
      console.log("Backend response received:", response);
      console.log("Response type:", typeof response);
      console.log("Response keys:", Object.keys(response || {}));
      
      // Store the location data for display
      setLocationData(response);
      
      // Check if response has the expected structure
      if (!response || typeof response.isWithinGeofence === 'undefined') {
        console.error("Invalid response structure:", response);
        // Don't change geofence status on invalid response
        return isWithinGeofence;
      }
      
      if (!response.isWithinGeofence) {
        console.log("🚨 User is outside geofence - showing Lab 404 page");
        console.log("Response:", response);
        console.log("About to call setIsWithinGeofence(false)...");
        
        // Use functional state update to ensure it's not overridden
        setIsWithinGeofence((prevState) => {
          console.log("setIsWithinGeofence functional update - prevState:", prevState);
          console.log("Setting to false");
          return false;
        });
        
        console.log("setIsWithinGeofence(false) called");
        return false;
      }
      
      console.log("✅ User is within geofence - verification successful");
      console.log("About to call setIsWithinGeofence(true)...");
      
      setIsWithinGeofence((prevState) => {
        console.log("setIsWithinGeofence functional update - prevState:", prevState);
        console.log("Setting to true");
        return true;
      });
      
      console.log("setIsWithinGeofence(true) called");
      
      // Set login location and store in localStorage on initial successful verification
      if (isInitialLogin) {
        console.log("Setting login location as reference point:", currentLocation);
        setLoginLocation(currentLocation);
        
        // Store login location in localStorage for persistence
        try {
          localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(currentLocation));
          console.log("Login location stored in localStorage:", currentLocation);
        } catch (error) {
          console.error("Error storing login location:", error);
        }
      } else {
        // For subsequent successful verifications, update the stored location
        try {
          localStorage.setItem(STORAGE_KEYS.LOCATION, JSON.stringify(currentLocation));
          console.log("Updated stored location in localStorage:", currentLocation);
        } catch (error) {
          console.error("Error updating stored location:", error);
        }
      }
      
      return true;
    } catch (error) {
      console.error("Location verification API error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // IMPORTANT: Don't just return true on error - this could mask real geofence violations
      // Instead, maintain current status for network errors, but handle API errors properly
      if (error.message.includes('response.json is not a function')) {
        console.error("API response parsing error - check your API implementation");
      }
      
      // For now, return current status to avoid disrupting user, but this should be improved
      console.log("Maintaining current geofence status due to API error");
      return isWithinGeofence; 
    }
  }, [user.id, isWithinGeofence]);

  // Initialize stored location on component mount
  useEffect(() => {
    try {
      const location = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCATION));
      if (location) {
        console.log("Loaded stored location from localStorage:", location);
        setLoginLocation(location);
      }
    } catch (error) {
      console.error("Error loading stored location:", error);
    }
  }, []);

  // Updated performLocationCheck function
  const performLocationCheck = useCallback(async () => {
    if (isLocationChecking) {
      console.log("Location check already in progress, skipping...");
      return;
    }
    
    setIsLocationChecking(true);
    setLocationCheckError('');
    
    try {
      const currentLocation = await getLocation();
      console.log("Current location obtained:", currentLocation);
      
      const isStillValid = await verifyLocationWithBackend(currentLocation, false);
      console.log("Backend verification result:", isStillValid);
      console.log("Current isWithinGeofence state:", isWithinGeofence);
      
      if (isStillValid) {
        console.log('✅ Location verified - user within geofence or close to stored location');
      } else {
        console.log('🚨 Location verification failed - user outside geofence');
        console.log('This should trigger Lab 404 page on next render');
      }
      
    } catch (error) {
      console.error('Location check failed with error:', error);
      console.error('Error stack:', error.stack);
      setLocationCheckError('Unable to check your location. Please ensure location services are enabled.');
    } finally {
      console.log("=== Location check completed ===");
      setIsLocationChecking(false);
    }
  }, [isLocationChecking, getLocation, verifyLocationWithBackend, isWithinGeofence]);

  // Set up initial location capture and periodic checking
  useEffect(() => {
    // Check if we have a stored location
    let storedLocation = null;
    try {
      storedLocation = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOCATION));
    } catch (error) {
      console.error("Error reading stored location:", error);
    }

    // Prevent multiple initial location captures
    if (initialLocationCaptured) {
      return;
    }

    // Initial location capture (only if no stored location)
    const captureInitialLocation = async () => {
      try {
        console.log('Capturing initial login location...');
        const initialLocation = await getLocation();
        console.log('Initial location captured:', initialLocation);
        
        // Perform initial verification and set as stored location
        await verifyLocationWithBackend(initialLocation, true);
        setInitialLocationCaptured(true);
        
      } catch (error) {
        console.error('Failed to capture initial location:', error);
        console.log("Initial location capture failed, continuing with normal dashboard");
        setInitialLocationCaptured(true); // Prevent retries
      }
    };
    
    // Only capture initial location if no stored location exists
    if (!storedLocation) {
      captureInitialLocation();
    } else {
      // If stored location exists, mark as captured to prevent initial capture
      setInitialLocationCaptured(true);
    }
  }, [getLocation, verifyLocationWithBackend, initialLocationCaptured]);

  // Separate effect for setting up the interval - runs only once
  useEffect(() => {
    // Only set up interval if not already running
    if (!intervalRef.current) {
      console.log("Setting up periodic location checks (1 minute interval)...");
      intervalRef.current = setInterval(() => {
        console.log("=== Periodic location check triggered ===");
        performLocationCheck();
      }, 1 * 60 * 1000); // 1 minute for testing
    }
    
    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        console.log("Cleaning up location check interval");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [performLocationCheck]); // Add performLocationCheck to dependencies

  // Manual location check function
  const handleManualLocationCheck = useCallback(() => {
    console.log("Manual location check triggered");
    performLocationCheck();
  }, [performLocationCheck]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      if (activeTab === DASHBOARD_TABS.OVERVIEW) {
        const [statsRes, labRes] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getLabInfo()
        ]);
        setStats(statsRes);
        setLabInfo(labRes);
      } else if (activeTab === DASHBOARD_TABS.EMPLOYEES) {
        const employeesRes = await usersAPI.getEmployees();
        setEmployees(employeesRes);
      } else if (activeTab === DASHBOARD_TABS.ACTIVITY) {
        const [attemptsRes, employeesRes] = await Promise.all([
          usersAPI.getLoginAttempts(),
          usersAPI.getEmployees()
        ]);
        setLoginAttempts(attemptsRes.loginAttempts || []);
        setEmployees(employeesRes);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    // Only load dashboard data if user is within geofence
    if (isWithinGeofence) {
      loadDashboardData();
    }
  }, [activeTab, loadDashboardData, isWithinGeofence]);

  const handleEmployeesUpdate = useCallback(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner size="lg" text="Loading dashboard data..." />;
    }

    switch (activeTab) {
      case DASHBOARD_TABS.OVERVIEW:
        return <Overview stats={stats} labInfo={labInfo} />;
      case DASHBOARD_TABS.EMPLOYEES:
        return (
          <EmployeeManagement
            user={user}
            employees={employees}
            onEmployeesUpdate={handleEmployeesUpdate}
          />
        );
      case DASHBOARD_TABS.ACTIVITY:
        return <ActivityMonitor loginAttempts={loginAttempts} employees={employees} />;
      default:
        return <Overview stats={stats} labInfo={labInfo} />;
    }
  };

  // If user is outside geofence, show Lab 404 page
  console.log("=== RENDER CHECK ===");
  console.log("Current isWithinGeofence:", isWithinGeofence);
  console.log("Type of isWithinGeofence:", typeof isWithinGeofence);
  console.log("isWithinGeofence === false:", isWithinGeofence === false);
  console.log("!isWithinGeofence:", !isWithinGeofence);
  
  if (!isWithinGeofence) {
    console.log("🚨 RENDERING LAB 404 PAGE - isWithinGeofence:", isWithinGeofence);
    return (
      <LabNotFoundPage 
        labInfo={labInfo}
        onRetryLocation={handleManualLocationCheck}
        isChecking={isLocationChecking}
      />
    );
  }

  console.log("✅ RENDERING NORMAL DASHBOARD - isWithinGeofence:", isWithinGeofence);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={user} onLogout={onLogout} stats={stats} />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} />

      {/* Location Check Status */}
      {isLocationChecking && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">Verifying your location...</p>
            </div>
          </div>
        </div>
      )}

      {/* Location Check Error */}
      {locationCheckError && (
        <Alert type="error" onClose={() => setLocationCheckError('')}>
          {locationCheckError}
        </Alert>
      )}

      {/* Location Success Info (Optional - for debugging) */}
      {locationData && locationData.isWithinGeofence && process.env.NODE_ENV === 'development' && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mx-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Location verified - Distance: {locationData.distance}m (within {locationData.radius}m radius)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        {renderContent()}
        
        {/* Development/Testing Info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-center space-y-2">
            {loginLocation && (
              <div className="mt-2 text-xs text-gray-500">
                Stored Location: {loginLocation.latitude.toFixed(6)}, {loginLocation.longitude.toFixed(6)}
                {locationData && (
                  <span className="ml-2">
                    (Distance from center: {locationData.distance}m)
                  </span>
                )}
              </div>
            )}
            {locationData && (
              <div className="mt-2 text-xs text-gray-500">
                Status: {locationData.isWithinGeofence ? 'Within' : 'Outside'} geofence | 
                Distance: {locationData.distance}m | Radius: {locationData.radius}m
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              © 2025 Lab Management System. All rights reserved.
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Connected to: {labInfo?.name || 'Loading...'}</span>
              <span className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isLocationChecking ? 'bg-yellow-400' : 'bg-green-400'
                }`}></div>
                {isLocationChecking ? 'Checking Location' : 'Online'}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;