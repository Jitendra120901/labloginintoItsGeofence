// hooks/useLocation.js - Simplified for basic lat/lng only
import { useState } from 'react';
import { getCurrentLocation } from '../utilis';

export const useLocation = () => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  const getLocation = async () => {
    setIsGettingLocation(true);
    setLocationError('');
    
    try {
      const location = await getCurrentLocation();
      
      // Return only basic coordinates
      const result = {
        latitude: location.latitude,
        longitude: location.longitude
      };
      
      setIsGettingLocation(false);
      return result;
      
    } catch (error) {
      setLocationError('Unable to get location. Please enable location access.');
      setIsGettingLocation(false);
      throw error;
    }
  };

  return {
    getLocation,
    isGettingLocation,
    locationError,
    clearLocationError: () => setLocationError('')
  };
};