import React, { useState, useEffect } from 'react';
import { authAPI, formatCoordinates } from '../utilis';
import { Alert, LoadingSpinner } from '../common';
import { 
  EnvironmentOutlined as MapPin,
  SafetyOutlined as Shield,
  TeamOutlined as Users,
  EyeOutlined as Eye,
  EyeInvisibleOutlined as EyeOff,
  InfoCircleOutlined as Info,
  QrcodeOutlined as QrCode,
  MobileOutlined as Smartphone,
  CheckCircleOutlined as CheckCircle,
  ExclamationCircleOutlined as AlertCircle,
  WifiOutlined as Wifi,
  DisconnectOutlined as WifiOff
} from '@ant-design/icons';

const LabRegistration = ({ onSuccess }) => {
  const [registrationMethod, setRegistrationMethod] = useState('traditional'); // 'traditional' or 'qr'
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    registrationNumber: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    latitude: '',
    longitude: '',
    geofenceRadius: '100'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  
  // QR Authentication states
  const [qrAuthState, setQrAuthState] = useState('scanning');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [wsConnected, setWsConnected] = useState(false);
  const [ws, setWs] = useState(null);
  const [locationData, setLocationData] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Traditional location capture from current device
  const handleGetLocation = async () => {
    try {
      setLocationStatus('Getting your location...');
      
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

      const formatted = formatCoordinates(location.latitude, location.longitude);
      
      setFormData({
        ...formData,
        latitude: formatted.latitude,
        longitude: formatted.longitude
      });
      
      setGpsAccuracy(location.accuracy);
      
      if (location.accuracy <= 15) {
        setLocationStatus(`Location acquired with excellent accuracy (${Math.round(location.accuracy)}m)`);
      } else if (location.accuracy <= 30) {
        setLocationStatus(`Location acquired with good accuracy (${Math.round(location.accuracy)}m)`);
      } else {
        setLocationStatus(`Location acquired but accuracy is poor (${Math.round(location.accuracy)}m) - Consider moving to an open area`);
      }
      
      setError('');
    } catch (err) {
      setError('Unable to get location: ' + err.message);
      setLocationStatus('');
    }
  };

  // QR Authentication WebSocket setup
  const connectWebSocket = () => {
    const wsUrl = 'wss://labmanagementdatabase.onrender.com';
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('Registration WebSocket connected');
      setWsConnected(true);
      setWs(websocket);
      
      // Register desktop session for registration
      websocket.send(JSON.stringify({
        type: 'register_desktop',
        data: {
          sessionId,
          userEmail: formData.adminEmail,
          labName: formData.name || 'Lab Registration',
          mode: 'registration'
        }
      }));
    };
    
    websocket.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        console.log('Registration WebSocket message:', type, data);
        
        switch (type) {
          case 'desktop_registered':
            console.log('Desktop registered for registration');
            break;
            
          case 'mobile_connected':
            setQrAuthState('authenticating');
            break;
            
          case 'passkey_verified':
          case 'passkey_created':
            setQrAuthState('processing');
            // Request location from mobile
            websocket.send(JSON.stringify({
              type: 'request_location',
              data: { sessionId, authData: data.authData }
            }));
            break;
            
          case 'location_received':
            console.log('Location received from mobile device');
            setLocationData(data.location);
            processLocationFromMobile(data.location);
            break;
            
          case 'error':
            setError(data.message);
            setQrAuthState('error');
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    websocket.onclose = () => {
      console.log('Registration WebSocket disconnected');
      setWsConnected(false);
      setWs(null);
      
      // Attempt reconnection
      setTimeout(connectWebSocket, 3000);
    };
    
    websocket.onerror = (error) => {
      console.error('Registration WebSocket error:', error);
      setWsConnected(false);
    };
  };

  // Process location data from mobile device
  const processLocationFromMobile = (location) => {
    const formatted = formatCoordinates(location.latitude, location.longitude);
    
    setFormData({
      ...formData,
      latitude: formatted.latitude,
      longitude: formatted.longitude
    });
    
    setGpsAccuracy(location.accuracy);
    
    if (location.accuracy <= 15) {
      setLocationStatus(`Location captured from mobile with excellent accuracy (${Math.round(location.accuracy)}m)`);
    } else if (location.accuracy <= 30) {
      setLocationStatus(`Location captured from mobile with good accuracy (${Math.round(location.accuracy)}m)`);
    } else {
      setLocationStatus(`Location captured from mobile but accuracy is poor (${Math.round(location.accuracy)}m)`);
    }
    
    setQrAuthState('success');
    setError('');
  };

  // Generate QR code for mobile location capture
  const generateQRCode = () => {
    if (!formData.adminEmail) {
      setError('Please enter admin email first');
      return;
    }

    const challenge = Date.now().toString();
    const mobileAuthUrl = `https://geofence-key-guard.netlify.app/mobile-auth?sessionId=${sessionId}&challenge=${challenge}&userEmail=${encodeURIComponent(formData.adminEmail)}&labName=${encodeURIComponent(formData.name || 'Lab Registration')}&mode=registration&requireLocation=true`;
    
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mobileAuthUrl)}`;
    setQrCodeUrl(qrUrl);
  };

  // Start QR-based location capture
  const startQRLocationCapture = () => {
    if (!formData.adminEmail) {
      setError('Please enter admin email first');
      return;
    }
    
    setRegistrationMethod('qr');
    setQrAuthState('scanning');
    generateQRCode();
    connectWebSocket();
  };

  // Switch back to traditional method
  const switchToTraditional = () => {
    setRegistrationMethod('traditional');
    setQrAuthState('scanning');
    setError('');
    setLocationStatus('');
    setLocationData(null);
    if (ws) {
      ws.close();
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        geofenceRadius: parseInt(formData.geofenceRadius),
        locationCaptureMethod: registrationMethod === 'qr' ? 'mobile_qr' : 'desktop_browser'
      };
      
      await authAPI.registerLab(submitData);
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getGPSAccuracyColor = () => {
    if (!gpsAccuracy) return 'text-gray-600';
    if (gpsAccuracy <= 15) return 'text-green-600';
    if (gpsAccuracy <= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRecommendedRadius = () => {
    if (!gpsAccuracy) return 100;
    const baseRadius = Math.max(50, Math.ceil(gpsAccuracy * 2));
    return Math.min(baseRadius, 200);
  };

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
      case 'scanning': return 'Scan QR code to capture location from mobile';
      case 'authenticating': return 'Complete authentication on mobile device';
      case 'processing': return 'Capturing location from mobile device...';
      case 'success': return 'Location captured successfully from mobile!';
      case 'error': return error || 'Failed to capture location';
      default: return 'Scan QR code to capture location from mobile';
    }
  };

  useEffect(() => {
    if (registrationMethod === 'qr' && qrAuthState === 'scanning') {
      generateQRCode();
    }
  }, [registrationMethod, qrAuthState, formData.adminEmail, formData.name]);

  if (loading) {
    return <LoadingSpinner size="lg" text="Registering lab..." />;
  }

  const QRStateIcon = getQRStateIcon();

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lab Registration</h1>
        <p className="text-gray-600">Register your laboratory with geofence authentication</p>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      <div className="space-y-6">
        {/* Lab Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Shield className="mr-2" size={20} />
            Lab Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lab Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ABC Medical Lab"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
              <input
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="LAB123456"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123 Medical Street, City, State, ZIP"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lab Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="lab@abcmedical.com"
              />
            </div>
          </div>
        </div>

        {/* Admin Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="mr-2" size={20} />
            Lab Administrator Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Name *</label>
              <input
                type="text"
                name="adminName"
                value={formData.adminName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Dr. John Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email *</label>
              <input
                type="email"
                name="adminEmail"
                value={formData.adminEmail}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@abcmedical.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <MapPin className="mr-2" size={20} />
            Geofence Location & Settings
          </h2>
          
          {/* Location Method Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">Location Capture Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                registrationMethod === 'traditional' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <div className="flex items-center mb-2">
                  <MapPin className="mr-2 text-blue-600" size={20} />
                  <span className="font-medium">Desktop Browser Location</span>
                </div>
                <p className="text-sm text-gray-600">
                  Capture location from this computer's browser
                </p>
                <button
                  type="button"
                  onClick={() => setRegistrationMethod('traditional')}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  {registrationMethod === 'traditional' ? 'Selected' : 'Select this method'}
                </button>
              </div>
              
              <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                registrationMethod === 'qr' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <div className="flex items-center mb-2">
                  <QrCode className="mr-2 text-green-600" size={20} />
                  <span className="font-medium">Mobile QR Location</span>
                </div>
                <p className="text-sm text-gray-600">
                  Capture precise location from mobile device
                </p>
                <button
                  type="button"
                  onClick={startQRLocationCapture}
                  disabled={!formData.adminEmail}
                  className="mt-2 text-sm text-green-600 hover:text-green-800 disabled:text-gray-400"
                >
                  {registrationMethod === 'qr' ? 'Selected' : 'Select this method'}
                </button>
              </div>
            </div>
          </div>

          {/* QR Code Interface */}
          {registrationMethod === 'qr' && (
            <div className="mb-6 p-4 bg-white rounded-lg border">
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  {wsConnected ? (
                    <span className="inline-flex items-center text-green-600 text-sm">
                      <Wifi className="h-4 w-4 mr-1" />
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-red-600 text-sm">
                      <WifiOff className="h-4 w-4 mr-1" />
                      Disconnected
                    </span>
                  )}
                </div>
                
                <div className="w-48 h-48 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto mb-4">
                  {qrCodeUrl && qrAuthState === 'scanning' ? (
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code for Location Capture" 
                      className="w-44 h-44 object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <QRStateIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
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
                    <p>1. Scan QR code with mobile camera</p>
                    <p>2. Complete authentication on mobile</p>
                    <p>3. Allow location access</p>
                    <p>4. Location will be captured automatically</p>
                  </div>
                )}

                {qrAuthState === 'success' && locationData && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">
                      ✓ Location captured from mobile device<br/>
                      Accuracy: {Math.round(locationData.accuracy)}m<br/>
                      Method: Mobile QR Authentication
                    </p>
                  </div>
                )}

                {qrAuthState === 'error' && (
                  <div className="mt-3 space-y-2">
                    <button
                      onClick={() => {
                        setQrAuthState('scanning');
                        setError('');
                        generateQRCode();
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={switchToTraditional}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 ml-2"
                    >
                      Use Browser Location
                    </button>
                  </div>
                )}

                {registrationMethod === 'qr' && qrAuthState !== 'error' && (
                  <button
                    onClick={switchToTraditional}
                    className="mt-3 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Switch to browser location instead
                  </button>
                )}
              </div>
            </div>
          )}

          {/* GPS Accuracy Info */}
          {gpsAccuracy && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center">
                <Info className="mr-2 text-blue-600" size={16} />
                <span className="text-sm text-blue-800">
                  GPS Accuracy: <span className={getGPSAccuracyColor()}>{Math.round(gpsAccuracy)}m</span>
                  {registrationMethod === 'qr' && <span className="ml-2">(Mobile Device)</span>}
                </span>
              </div>
              <p className="text-xs text-blue-700 mt-1">
                Recommended geofence radius: {getRecommendedRadius()}m (based on GPS accuracy + buffer)
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude *</label>
              <input
                type="number"
                step="any"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="40.712800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude *</label>
              <input
                type="number"
                step="any"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="-74.006000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geofence Radius (meters) *</label>
              <select
                name="geofenceRadius"
                value={formData.geofenceRadius}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="50">50m - Small office</option>
                <option value="100">100m - Medium building</option>
                <option value="150">150m - Large building</option>
                <option value="200">200m - Campus area</option>
                <option value="300">300m - Large campus</option>
              </select>
            </div>
          </div>
          
          {/* Traditional location capture button */}
          {registrationMethod === 'traditional' && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <MapPin className="mr-2" size={16} />
                {loading ? 'Getting Location...' : 'Use Current Browser Location'}
              </button>
              
              {locationStatus && (
                <div className="mt-2 text-sm text-gray-700">
                  <span className="font-medium">Status:</span> {locationStatus}
                </div>
              )}
            </div>
          )}
          
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">Geofence Guidelines:</h4>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Choose radius based on your lab's physical size</li>
              <li>• Account for GPS accuracy (typically 5-30m in urban areas)</li>
              <li>• Mobile QR method usually provides better accuracy than browser</li>
              <li>• Consider parking areas and building entrances</li>
              <li>• Test with employees before finalizing</li>
              <li>• You can adjust this later from admin settings</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.latitude || !formData.longitude}
            className="px-8 py-3 bg-green-600 text-white text-lg font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Registering Lab...' : 'Register Lab'}
          </button>
        </div>

        {(!formData.latitude || !formData.longitude) && (
          <div className="text-center">
            <p className="text-sm text-red-600">
              Please capture location coordinates before registering
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabRegistration;