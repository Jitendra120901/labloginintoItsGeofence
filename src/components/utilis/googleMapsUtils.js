// utils/googleMapsUtils.js

let googleMapsPromise = null;
let googleMapsLoaded = false;

// Configuration
const GOOGLE_MAPS_CONFIG = {
  apiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY',
  libraries: ['places', 'marker'],
  version: 'weekly'
};

/**
 * Loads Google Maps API asynchronously
 * @returns {Promise} Promise that resolves when Google Maps API is loaded
 */
export const loadGoogleMapsAPI = () => {
  // Return existing promise if already loading
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  // Return resolved promise if already loaded
  if (googleMapsLoaded && window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  // Create new promise to load the API
  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if script is already in DOM and working
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript && window.google && window.google.maps) {
      googleMapsLoaded = true;
      resolve(window.google.maps);
      return;
    }

    // Remove any broken existing scripts
    if (existingScript && (!window.google || !window.google.maps)) {
      existingScript.remove();
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.apiKey}&libraries=${GOOGLE_MAPS_CONFIG.libraries.join(',')}&v=${GOOGLE_MAPS_CONFIG.version}&loading=async`;
    script.async = true;
    script.defer = true;

    // Handle successful load
    script.onload = () => {
      // Wait a bit for Google Maps to fully initialize
      const checkGoogleMaps = () => {
        if (window.google && window.google.maps && window.google.maps.Map) {
          googleMapsLoaded = true;
          resolve(window.google.maps);
        } else {
          setTimeout(checkGoogleMaps, 50);
        }
      };
      checkGoogleMaps();
    };

    // Handle error
    script.onerror = (error) => {
      googleMapsPromise = null; // Reset promise so it can be retried
      script.remove(); // Clean up failed script
      reject(new Error('Failed to load Google Maps API'));
    };

    // Add script to DOM
    document.head.appendChild(script);
  });

  return googleMapsPromise;
};

/**
 * Checks if Google Maps API is loaded
 * @returns {boolean} True if Google Maps API is loaded
 */
export const isGoogleMapsLoaded = () => {
  return googleMapsLoaded && window.google && window.google.maps;
};

/**
 * Creates a marker with fallback to regular marker if AdvancedMarkerElement is not available
 * @param {Object} options - Marker options
 * @param {google.maps.Map} options.map - Map instance
 * @param {google.maps.LatLng} options.position - Marker position
 * @param {string} options.title - Marker title
 * @param {string} options.color - Marker color
 * @param {number} options.size - Marker size
 * @returns {google.maps.Marker|google.maps.marker.AdvancedMarkerElement} Marker instance
 */
export const createMarker = ({ map, position, title, color = '#4F46E5', size = 10 }) => {
  if (!isGoogleMapsLoaded()) {
    throw new Error('Google Maps API is not loaded');
  }

  // Use AdvancedMarkerElement if available
  if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
    const markerElement = document.createElement('div');
    markerElement.style.cssText = `
      width: ${size * 2}px;
      height: ${size * 2}px;
      background-color: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      cursor: pointer;
    `;

    return new window.google.maps.marker.AdvancedMarkerElement({
      position,
      map,
      title,
      content: markerElement
    });
  }

  // Fallback to regular marker
  return new window.google.maps.Marker({
    position,
    map,
    title,
    icon: {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: size,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2
    }
  });
};

/**
 * Creates an info window with consistent styling
 * @param {Object} options - Info window options
 * @param {string} options.title - Title text
 * @param {Array} options.content - Array of content objects {label, value}
 * @returns {google.maps.InfoWindow} Info window instance
 */
export const createInfoWindow = ({ title, content = [] }) => {
  if (!isGoogleMapsLoaded()) {
    throw new Error('Google Maps API is not loaded');
  }

  const contentHTML = `
    <div style="padding: 12px; min-width: 200px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <h4 style="margin: 0 0 12px 0; font-weight: 600; color: #1f2937;">${title}</h4>
      ${content.map(item => `
        <p style="margin: 6px 0; font-size: 14px; color: #4b5563;">
          <strong style="color: #1f2937;">${item.label}:</strong> ${item.value}
        </p>
      `).join('')}
    </div>
  `;

  return new window.google.maps.InfoWindow({
    content: contentHTML,
    disableAutoPan: false,
    maxWidth: 300
  });
};

/**
 * Creates a geofence circle
 * @param {Object} options - Circle options
 * @param {google.maps.Map} options.map - Map instance
 * @param {google.maps.LatLng} options.center - Circle center
 * @param {number} options.radius - Circle radius in meters
 * @param {string} options.color - Circle color
 * @returns {google.maps.Circle} Circle instance
 */
export const createGeofenceCircle = ({ map, center, radius, color = '#4F46E5' }) => {
  if (!isGoogleMapsLoaded()) {
    throw new Error('Google Maps API is not loaded');
  }

  return new window.google.maps.Circle({
    strokeColor: color,
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: color,
    fillOpacity: 0.15,
    map,
    center,
    radius
  });
};

/**
 * Resets the Google Maps loading state (useful for error recovery)
 */
export const resetGoogleMapsAPI = () => {
  googleMapsPromise = null;
  googleMapsLoaded = false;
  
  // Remove existing scripts
  const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
  existingScripts.forEach(script => script.remove());
  
  // Clear Google Maps from window if it exists
  if (window.google && window.google.maps) {
    delete window.google;
  }
};

/**
 * Handles common Google Maps API errors
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export const handleMapsError = (error) => {
  const errorMessage = error.message || error.toString();
  
  if (errorMessage.includes('ApiTargetBlockedMapError')) {
    return 'Google Maps API key is restricted. Please check your API key configuration and ensure your domain is allowed.';
  }
  
  if (errorMessage.includes('InvalidKeyMapError')) {
    return 'Invalid Google Maps API key. Please check your API key in the environment variables.';
  }
  
  if (errorMessage.includes('RefererNotAllowedMapError')) {
    return 'Domain not allowed for this API key. Please add your domain to the API key restrictions in Google Cloud Console.';
  }
  
  if (errorMessage.includes('QuotaExceededError')) {
    return 'Google Maps API quota exceeded. Please check your billing account and quotas in Google Cloud Console.';
  }
  
  if (errorMessage.includes('InvalidValueError') && errorMessage.includes('mapDiv')) {
    return 'Map container error. Please try again.';
  }
  
  if (errorMessage.includes('Map container became unavailable')) {
    return 'Map container was removed. Please try showing the map again.';
  }
  
  if (errorMessage.includes('Failed to load Google Maps API')) {
    return 'Failed to load Google Maps. Please check your internet connection and API key.';
  }
  
  return 'Failed to initialize Google Maps. Please try again.';
};