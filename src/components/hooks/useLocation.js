    // hooks/useLocation.js
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
      setIsGettingLocation(false);
      return location;
    } catch (error) {
      setLocationError('Unable to get location. Please enable location access or enter coordinates manually.');
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