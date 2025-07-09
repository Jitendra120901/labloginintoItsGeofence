import React, { useState, useEffect } from 'react';
import { authAPI } from '../utilis';
import { Alert } from '../common';
import { 
  QrcodeOutlined as QrCode,
  MobileOutlined as Smartphone,
  SafetyOutlined as Shield,
  CheckCircleOutlined as CheckCircle,
  ExclamationCircleOutlined as AlertCircle,
  WifiOutlined as Wifi,
  DisconnectOutlined as WifiOff
} from '@ant-design/icons';

const Login = ({ onLogin }) => {
  const [authMethod, setAuthMethod] = useState('traditional'); // 'traditional' or 'qr'
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  
  // QR Authentication states
  const [qrAuthState, setQrAuthState] = useState('scanning');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [wsConnected, setWsConnected] = useState(false);
  const [ws, setWs] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [authData, setAuthData] = useState(null);
  
  // Debug logging
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const addDebugLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    setDebugLogs(prev => [...prev.slice(-10), logEntry]);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Traditional login with device location
  const handleTraditionalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLocationStatus('Getting your location...');

    try {
      // Get location from current device
      const location = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported'));
          return;
        }
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
          },
          (error) => {
            reject(new Error('Unable to get location: ' + error.message));
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      });
      
      setLocationStatus('Verifying location...');
      
      // Login with current device location
      const response = await authAPI.login({
        ...formData,
        latitude: location.latitude,
        longitude: location.longitude,
        authMethod: 'traditional'
      });

      setLocationStatus('Login successful!');
      onLogin(response.user, response.token, response.useCurrentLocation);
      
    } catch (err) {
      setError(err.message);
      setLocationStatus('');
      
      if (err.message.includes('Access denied')) {
        setLocationStatus('You are outside the lab premises. Please move closer and try again.');
      } else if (err.message.includes('location')) {
        setLocationStatus('Please enable location services and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // QR Authentication WebSocket setup
  const connectWebSocket = () => {
    const wsUrl = 'wss://labmanagementdatabase.onrender.com';
    
    addDebugLog(`🔗 Connecting to WebSocket: ${wsUrl}`);
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      addDebugLog('✅ Desktop WebSocket connected');
      setWsConnected(true);
      setWs(websocket);
      
      // Register desktop session for login
      const registrationMessage = {
        type: 'register_desktop',
        data: {
          sessionId,
          userEmail: formData.email,
          labName: 'Lab Login',
          mode: 'login'
        }
      };
      
      addDebugLog('📤 Registering desktop session');
      websocket.send(JSON.stringify(registrationMessage));
    };
    
    // Enhanced WebSocket message handler
    websocket.onmessage = (event) => {
      try {
        const messageData = JSON.parse(event.data);
        addDebugLog(`🔵 Received: ${messageData.type}`);
        console.log('Desktop WebSocket message:', messageData);
        
        const { type, data } = messageData;
        
        switch (type) {
          case 'connected':
            addDebugLog(`🔗 Connected with ID: ${data?.connectionId}`);
            break;
            
          case 'desktop_registered':
            addDebugLog('✅ Desktop registered for login');
            setQrAuthState('scanning');
            break;
            
          case 'mobile_connected':
            addDebugLog('📱 Mobile device connected');
            setQrAuthState('authenticating');
            setLocationStatus('Mobile device connected. Complete authentication...');
            break;
            
          case 'passkey_verified':
          case 'passkey_created':
            addDebugLog('🔐 Passkey authentication confirmed');
            setQrAuthState('processing');
            setLocationStatus('Authentication successful. Requesting location...');
            
            // Store auth data
            setAuthData(data?.authData);
            
            // The server should send us request_location_from_mobile next
            // We don't need to do anything here, just wait
            break;
            
          case 'request_location_from_mobile':
            addDebugLog('📍 Server instructing desktop to request location');
            setLocationStatus('Requesting location from mobile device...');
            
            // Now we send the location request to the server
            const locationRequestMessage = {
              type: 'request_location',
              data: {
                sessionId,
                authData: data?.authData || authData,
                requestId: Date.now().toString()
              }
            };
            
            addDebugLog('📤 Sending location request to server');
            addDebugLog(`📤 Location request: ${JSON.stringify(locationRequestMessage, null, 2)}`);
            websocket.send(JSON.stringify(locationRequestMessage));
            break;
            
          case 'location_received':
            addDebugLog('📍 Location received from mobile device');
            const receivedLocation = data?.location;
            const receivedAuth = data?.authData;
            
            if (receivedLocation && receivedLocation.latitude && receivedLocation.longitude) {
              setLocationData(receivedLocation);
              setLocationStatus('Location received. Performing geofence check...');
              
              // Perform geofence check
              performGeofenceCheck(receivedLocation, receivedAuth);
            } else {
              addDebugLog('❌ Invalid location data received');
              setError('Invalid location data received from mobile device');
              setQrAuthState('error');
            }
            break;
            
          case 'access_granted':
            addDebugLog('✅ Access granted by server');
            setQrAuthState('success');
            setLocationStatus('Access granted! Redirecting...');
            
            // Complete the login process
            setTimeout(() => {
              onLogin(data?.user || { email: formData.email }, 'qr_token', {
                ...locationData,
                authMethod: 'qr_passkey',
                sessionId
              });
            }, 1500);
            break;
            
          case 'access_denied':
            addDebugLog('❌ Access denied by server');
            setError(data?.message || 'Access denied');
            setQrAuthState('error');
            setLocationStatus('');
            break;

          case 'error':
            addDebugLog(`❌ Server error: ${data?.message}`);
            setError(data?.message || 'Authentication error');
            setQrAuthState('error');
            setLocationStatus('');
            break;

          default:
            addDebugLog(`❓ Unknown message type: ${type}`);
            break;
        }
      } catch (error) {
        addDebugLog(`❌ Error parsing message: ${error.message}`);
        console.error('Error parsing WebSocket message:', error);
        setError('Communication error with server');
        setQrAuthState('error');
      }
    };
    
    websocket.onclose = (event) => {
      addDebugLog(`🔌 WebSocket closed: ${event.code} - ${event.reason || 'No reason'}`);
      setWsConnected(false);
      setWs(null);
      
      // Attempt reconnection if not in terminal states
      if (qrAuthState !== 'success' && qrAuthState !== 'error') {
        setTimeout(() => {
          addDebugLog('🔄 Attempting reconnection...');
          connectWebSocket();
        }, 3000);
      }
    };
    
    websocket.onerror = (error) => {
      addDebugLog(`❌ WebSocket error: ${error}`);
      setWsConnected(false);
    };
  };

  // Perform geofence check on desktop
  const performGeofenceCheck = async (location, authInfo) => {
    try {
      addDebugLog('🎯 Performing geofence check...');
      
      // Example lab coordinates - replace with actual coordinates
      const labLocation = {
        latitude: 30.7333,  // Replace with actual lab coordinates
        longitude: 76.7794  // Replace with actual lab coordinates
      };
      
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        labLocation.latitude,
        labLocation.longitude
      );
      
      addDebugLog(`📏 Distance to lab: ${distance.toFixed(2)}m`);
      
      const maxDistance = 100; // 100 meters radius
      const isWithinGeofence = distance <= maxDistance;
      
      // Send result back to server
      const locationCheckResult = {
        type: 'location_check_complete',
        data: {
          sessionId,
          success: isWithinGeofence,
          distance: Math.round(distance),
          location: location,
          authData: authInfo,
          error: isWithinGeofence ? null : `You must be within ${maxDistance}m of the lab (currently ${Math.round(distance)}m away)`
        }
      };
      
      addDebugLog(`📤 Sending location check result: ${isWithinGeofence ? 'PASS' : 'FAIL'}`);
      ws.send(JSON.stringify(locationCheckResult));
      
    } catch (error) {
      addDebugLog(`❌ Geofence check error: ${error.message}`);
      
      // Send error result
      const errorResult = {
        type: 'location_check_complete',
        data: {
          sessionId,
          success: false,
          distance: null,
          location: location,
          authData: authInfo,
          error: 'Failed to verify location'
        }
      };
      
      ws.send(JSON.stringify(errorResult));
    }
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
  };

  // Generate QR code for mobile authentication
  const generateQRCode = React.useCallback(() => {
    if (!formData.email) {
      setError('Please enter your email first');
      return;
    }

    const challenge = Date.now().toString();
    const mobileAuthUrl = `https://geofence-key-guard.netlify.app/mobile-auth?sessionId=${sessionId}&challenge=${challenge}&userEmail=${encodeURIComponent(formData.email)}&labName=${encodeURIComponent('Lab Login')}&mode=login&requireLocation=true`;
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mobileAuthUrl)}`;
    setQrCodeUrl(qrUrl);
    
    addDebugLog('🎯 QR code generated');
  }, [formData.email, sessionId]);

  // Initialize QR authentication
  const startQRAuth = () => {
    if (!formData.email) {
      setError('Please enter your email first');
      return;
    }
    
    setAuthMethod('qr');
    setQrAuthState('scanning');
    setError('');
    setLocationStatus('');
    setDebugLogs([]);
    generateQRCode();
    connectWebSocket();
  };

  // Switch back to traditional login
  const switchToTraditional = () => {
    setAuthMethod('traditional');
    setQrAuthState('scanning');
    setError('');
    setLocationStatus('');
    setDebugLogs([]);
    if (ws) {
      ws.close();
    }
  };

  useEffect(() => {
    if (authMethod === 'qr' && qrAuthState === 'scanning') {
      generateQRCode();
    }
  }, [authMethod, qrAuthState, generateQRCode]);

  const getQRStateIcon = () => {
    switch (qrAuthState) {
      case 'scanning': return QrCode;
      case 'authenticating': return Smartphone;
      case 'processing': return Shield;
      case 'success': return CheckCircle;
      case 'error': return AlertCircle;
      default: return QrCode;
    }
  };

  const getQRStateMessage = () => {
    switch (qrAuthState) {
      case 'scanning': return 'Scan QR code with your mobile device';
      case 'authenticating': return 'Complete passkey authentication on mobile';
      case 'processing': return 'Processing authentication and location...';
      case 'success': return 'Login successful! Redirecting...';
      case 'error': return error || 'Authentication failed';
      default: return 'Scan QR code with your mobile device';
    }
  };

  const QRStateIcon = getQRStateIcon();

  if (authMethod === 'qr') {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Secure Mobile Login</h1>
          <p className="text-gray-600">Authenticate with your mobile device</p>
        </div>

        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <div className="space-y-6">
          {/* Email display */}
          <div className="text-center">
            <p className="text-sm text-gray-600">Logging in as:</p>
            <p className="font-semibold text-gray-900">{formData.email}</p>
            <p className="text-xs text-gray-500">Session: {sessionId.substring(0, 20)}...</p>
            <div className="flex items-center justify-center mt-2">
              {wsConnected ? (
                <span className="inline-flex items-center text-green-600 text-xs">
                  <Wifi className="mr-1" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center text-red-600 text-xs">
                  <WifiOff className="mr-1" />
                  Disconnected
                </span>
              )}
            </div>
          </div>

          {/* QR Code Section */}
          <div className="text-center">
            <div className="w-48 h-48 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto mb-4">
              {qrCodeUrl && qrAuthState === 'scanning' ? (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code for Mobile Authentication" 
                  className="w-44 h-44 object-contain"
                />
              ) : (
                <div className="text-center">
                  <QRStateIcon className="text-6xl text-gray-400 mb-2" />
                  {(qrAuthState === 'authenticating' || qrAuthState === 'processing') && (
                    <div className="animate-spin w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-2"></div>
                  )}
                </div>
              )}
            </div>
            
            <h3 className="font-semibold mb-2">{getQRStateMessage()}</h3>
            
            {qrAuthState === 'scanning' && (
              <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
                <p><strong>Instructions:</strong></p>
                <p>1. Open camera on your mobile device</p>
                <p>2. Scan the QR code above</p>
                <p>3. Complete biometric authentication</p>
                <p>4. Allow location access for verification</p>
              </div>
            )}

            {locationData && qrAuthState === 'processing' && (
              <div className="mt-3 p-2 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700">
                  ✓ Location received from mobile device<br/>
                  Lat: {locationData.latitude?.toFixed(6)}<br/>
                  Lng: {locationData.longitude?.toFixed(6)}<br/>
                  Accuracy: ±{Math.round(locationData.accuracy)}m
                </p>
              </div>
            )}

            {locationStatus && (
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">{locationStatus}</p>
              </div>
            )}
          </div>

          {/* Debug Panel */}
          {showDebugPanel && (
            <div className="bg-black text-green-400 p-3 rounded-lg text-xs font-mono max-h-48 overflow-y-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">🔍 Debug Console</span>
                <button 
                  onClick={() => setShowDebugPanel(false)}
                  className="text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1">
                {debugLogs.map((log, index) => (
                  <div key={index} className="break-words">{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {qrAuthState === 'error' && (
              <button
                onClick={() => {
                  setQrAuthState('scanning');
                  setError('');
                  setLocationStatus('');
                  generateQRCode();
                  if (ws) {
                    ws.close();
                  }
                  setTimeout(connectWebSocket, 1000);
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
              >
                {showDebugPanel ? 'Hide' : 'Show'} Debug
              </button>
              <button
                onClick={switchToTraditional}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
              >
                Traditional Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Traditional login interface
  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Login</h1>
        <p className="text-gray-600">Access Lab Management System</p>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your password"
          />
        </div>

        {locationStatus && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800">{locationStatus}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleTraditionalSubmit}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <button
            onClick={startQRAuth}
            disabled={!formData.email}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <QrCode className="mr-2" />
            Use Mobile Authentication
          </button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Note: Lab employees can only login from within the lab premises
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Mobile authentication captures location from your mobile device for enhanced security
        </p>
      </div>
    </div>
  );
};

export default Login;