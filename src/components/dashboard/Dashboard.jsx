// components/dashboard/Dashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DASHBOARD_TABS, dashboardAPI, usersAPI, authAPI } from '../utilis';
import { useLocation } from '../hooks';
import { Alert, LoadingSpinner } from '../common';
import Overview from './Overview';
import EmployeeManagement from './EmployeeManagement';
import ActivityMonitor from './ActivityMonitor';
import Header from './Header';
import Navigation from './Navigation';

const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(DASHBOARD_TABS.OVERVIEW);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [labInfo, setLabInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Location verification states
  const [lastLocation, setLastLocation] = useState(null);
  const [locationCheckError, setLocationCheckError] = useState('');
  const [isLocationChecking, setIsLocationChecking] = useState(false);
  const intervalRef = useRef(null);
  
  const { getLocation } = useLocation();

  // Function to compare two locations with a small tolerance
  const areLocationsSimilar = (loc1, loc2, toleranceInMeters = 10) => {
    if (!loc1 || !loc2) return false;
    
    // Simple distance calculation for quick comparison
    const latDiff = Math.abs(loc1.latitude - loc2.latitude);
    const lngDiff = Math.abs(loc1.longitude - loc2.longitude);
    
    // Rough conversion: 1 degree ≈ 111,000 meters
    // For small distances, this approximation is sufficient
    const distanceInMeters = Math.sqrt(
      Math.pow(latDiff * 111000, 2) + 
      Math.pow(lngDiff * 111000 * Math.cos(loc1.latitude * Math.PI / 180), 2)
    );
    
    return distanceInMeters <= toleranceInMeters;
  };

  // Function to verify user location with backend
  const verifyLocationWithBackend = async (currentLocation) => {
    try {
      const response = await authAPI.verifyUserLocation({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        userId: user.id
      });
      
      if (!response.isWithinGeofence) {
        // User is outside geofence - force logout
        setLocationCheckError('You have moved outside the lab premises. Please log in again from within the lab.');
        setTimeout(() => {
          onLogout();
        }, 3000);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Location verification failed:', error);
      setLocationCheckError('Unable to verify your location. Please check your connection.');
      return false;
    }
  };

  // Main location check function
  const performLocationCheck = async () => {
    if (isLocationChecking) return; // Prevent multiple simultaneous checks
    
    setIsLocationChecking(true);
    setLocationCheckError('');
    
    try {
      // Get current location
      const currentLocation = await getLocation();
      
      // If this is the first check, just store the location
      if (!lastLocation) {
        setLastLocation(currentLocation);
        setIsLocationChecking(false);
        return;
      }
      
      // Check if location has changed significantly
      // const locationChanged = !areLocationsSimilar(lastLocation, currentLocation, 15);
      
      if (1==1) {
        console.log('Location changed detected, verifying with backend...');
        
        // Location has changed, verify with backend
        const isStillValid = await verifyLocationWithBackend(currentLocation);
        
        if (isStillValid) {
          // Update last known location
          setLastLocation(currentLocation);
          console.log('Location verified - user still within geofence');
        }
      } else {
        console.log('Location unchanged, no backend verification needed');
      }
      
    } catch (error) {
      console.error('Location check failed:', error);
      setLocationCheckError('Unable to check your location. Please ensure location services are enabled.');
    } finally {
      setIsLocationChecking(false);
    }
  };

  // Set up periodic location checking
  useEffect(() => {
    // Initial location capture
    const captureInitialLocation = async () => {
      try {
        const initialLocation = await getLocation();
        setLastLocation(initialLocation);
        console.log('Initial location captured:', initialLocation);
      } catch (error) {
        console.error('Failed to capture initial location:', error);
      }
    };
    
    captureInitialLocation();
    
    // Set up interval for periodic checks (every 3 minutes)
    intervalRef.current = setInterval(() => {
      performLocationCheck();
    }, 1 * 60 * 1000); // 3 minutes in milliseconds
    
    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Manual location check function (for testing purposes)
  const handleManualLocationCheck = () => {
    performLocationCheck();
  };

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
    loadDashboardData();
  }, [activeTab, loadDashboardData]);

  const handleEmployeesUpdate = () => {
    loadDashboardData();
  };

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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        {renderContent()}
        
        {/* Development/Testing Button - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-center">
            <button
              onClick={handleManualLocationCheck}
              disabled={isLocationChecking}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              {isLocationChecking ? 'Checking...' : 'Test Location Check'}
            </button>
            {lastLocation && (
              <div className="mt-2 text-xs text-gray-500">
                Last Location: {lastLocation.latitude.toFixed(6)}, {lastLocation.longitude.toFixed(6)}
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