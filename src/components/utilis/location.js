// utils/location.js - Updated to include GPS accuracy
export const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy, // GPS accuracy in meters - IMPORTANT!
            timestamp: position.timestamp,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed
          });
        },
        (error) => {
          let errorMessage = 'Unable to retrieve location';
          
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location services.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please check GPS settings.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = 'An unknown error occurred while retrieving location.';
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,    // Use GPS instead of network location
          timeout: 15000,             // 15 second timeout
          maximumAge: 30000           // Accept cached location up to 30 seconds old
        }
      );
    });
  };
  
  export const formatCoordinates = (latitude, longitude) => {
    return {
      latitude: parseFloat(latitude).toFixed(6),
      longitude: parseFloat(longitude).toFixed(6)
    };
  };
  
  export const validateCoordinates = (latitude, longitude) => {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      !isNaN(latitude) &&
      !isNaN(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  };
  
  // New utility functions for GPS accuracy
  export const getGPSAccuracyStatus = (accuracy) => {
    if (accuracy <= 5) return { level: 'excellent', color: 'green', message: 'Excellent GPS signal' };
    if (accuracy <= 15) return { level: 'good', color: 'blue', message: 'Good GPS signal' };
    if (accuracy <= 30) return { level: 'fair', color: 'yellow', message: 'Fair GPS signal' };
    return { level: 'poor', color: 'red', message: 'Poor GPS signal - move to open area' };
  };
  
  export const formatDistance = (distanceInMeters) => {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)} meters`;
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)} km`;
    }
  };