// hooks/useLocation.js - Enhanced with GPS accuracy and retries
import { useState } from 'react';
import { getCurrentLocation } from '../utilis';

export const useLocation = () => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  const getLocation = async (maxRetries = 3) => {
    setIsGettingLocation(true);
    setLocationError('');
    setGpsAccuracy(null);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const location = await getCurrentLocation();
        
        // Store GPS accuracy for display
        setGpsAccuracy(location.accuracy);
        
        // If this is the first attempt or we have good accuracy, return immediately
        if (attempt === 1 || location.accuracy <= 30) {
          setIsGettingLocation(false);
          return location;
        }
        
        // If accuracy is poor and we have retries left, wait and try again
        if (attempt < maxRetries && location.accuracy > 30) {
          console.log(`GPS accuracy is ${location.accuracy}m, retrying... (${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        // Last attempt - return even if accuracy is poor
        console.warn(`GPS accuracy is ${location.accuracy}m - proceeding with login`);
        setIsGettingLocation(false);
        return location;
        
      } catch (error) {
        console.error(`Location attempt ${attempt} failed:`, error);
        
        // If this is the last attempt, throw the error
        if (attempt === maxRetries) {
          setLocationError('Unable to get location. Please enable location access or check GPS settings.');
          setIsGettingLocation(false);
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };

  const getLocationWithCallback = async (onProgress) => {
    setIsGettingLocation(true);
    setLocationError('');
    setGpsAccuracy(null);
    
    try {
      if (onProgress) onProgress('Getting your location...');
      
      const location = await getCurrentLocation();
      setGpsAccuracy(location.accuracy);
      
      if (onProgress) {
        if (location.accuracy <= 15) {
          onProgress(`GPS accuracy: ${Math.round(location.accuracy)}m - Excellent signal`);
        } else if (location.accuracy <= 30) {
          onProgress(`GPS accuracy: ${Math.round(location.accuracy)}m - Good signal`);
        } else {
          onProgress(`GPS accuracy: ${Math.round(location.accuracy)}m - Poor signal, may cause issues`);
        }
      }
      
      setIsGettingLocation(false);
      return location;
      
    } catch (error) {
      setLocationError('Unable to get location. Please enable location access or check GPS settings.');
      setIsGettingLocation(false);
      if (onProgress) onProgress(`Location error: ${error.message}`);
      throw error;
    }
  };

  return {
    getLocation,
    getLocationWithCallback,
    isGettingLocation,
    locationError,
    gpsAccuracy,
    clearLocationError: () => setLocationError(''),
    clearGpsAccuracy: () => setGpsAccuracy(null)
  };
};