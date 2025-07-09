import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MobileOutlined as Smartphone,
  SafetyOutlined as Shield,
  CheckCircleOutlined as CheckCircle,
  ExclamationCircleOutlined as AlertCircle,
  SafetyCertificateOutlined as Fingerprint,
  WifiOutlined as Wifi,
  DisconnectOutlined as WifiOff,
  EnvironmentOutlined as MapPin
} from '@ant-design/icons';

type MobileAuthState = "ready" | "authenticating" | "location-capture" | "processing" | "success" | "error";

const MobileAuthWithLocation: React.FC = () => {
  const [authState, setAuthState] = useState<MobileAuthState>("ready");
  const [sessionId, setSessionId] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [labName, setLabName] = useState<string>("");
  const [mode, setMode] = useState<string>("login");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [locationData, setLocationData] = useState<any>(null);
  const [authData, setAuthData] = useState<any>(null);
  const [requireLocation, setRequireLocation] = useState<boolean>(false);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<string>('unknown');
  
  // Debug states
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Debug logging function
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    setDebugLogs(prev => [...prev.slice(-15), logEntry]); // Keep last 15 logs
  };

  // Check if WebAuthn is supported
  const isWebAuthnSupported = (): boolean => {
    return typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;
  };

  // Check location permission status
  const checkLocationPermission = async (): Promise<string> => {
    if (!navigator.geolocation) {
      return 'not_supported';
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      addDebugLog(`📍 Location permission: ${permission.state}`);
      setLocationPermissionStatus(permission.state);
      return permission.state;
    } catch (error) {
      addDebugLog(`📍 Error checking location permission: ${error.message}`);
      return 'unknown';
    }
  };

  // Request location permission explicitly
  const requestLocationPermission = async (): Promise<boolean> => {
    addDebugLog('📍 Requesting location permission...');
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });

      addDebugLog('✅ Location permission granted');
      setLocationPermissionStatus('granted');
      return true;
    } catch (error: any) {
      addDebugLog(`❌ Location permission denied: ${error.message}`);
      setLocationPermissionStatus('denied');
      return false;
    }
  };

  // Capture location from mobile device
  const captureLocation = async (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported on this device'));
        return;
      }

      addDebugLog('📍 Capturing precise location...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: Date.now()
          };
          
          addDebugLog(`📍 Location captured: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (±${Math.round(location.accuracy)}m)`);
          setLocationData(location);
          resolve(location);
        },
        (error) => {
          addDebugLog(`📍 Location capture error: ${error.code} - ${error.message}`);
          let errorMsg = 'Unable to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = 'Location access denied. Please enable location services.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMsg = 'Location request timed out.';
              break;
          }
          reject(new Error(errorMsg));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    });
  };

  // Enhanced location capture with detailed logging
  const captureAndSendLocation = React.useCallback(async () => {
    try {
      addDebugLog('📍 Starting location capture process...');
      setAuthState("location-capture");
      
      // Check WebSocket state before proceeding
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        const wsState = ws ? `state: ${ws.readyState}` : 'WebSocket is null';
        addDebugLog(`❌ WebSocket not ready: ${wsState}`);
        throw new Error(`WebSocket not ready: ${wsState}`);
      }
      
      addDebugLog('✅ WebSocket is ready, capturing location...');
      const location = await captureLocation();
      
      setAuthState("processing");
      
      const locationMessage = {
        type: 'location_received',
        data: {
          sessionId,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            altitude: location.altitude,
            timestamp: location.timestamp
          },
          authData: authData
        }
      };
      
      addDebugLog('📤 Sending location to server...');
      addDebugLog(`📤 Location data: Lat: ${location.latitude.toFixed(6)}, Lng: ${location.longitude.toFixed(6)}, Accuracy: ${Math.round(location.accuracy)}m`);
      
      ws.send(JSON.stringify(locationMessage));
      
      // Wait for server response instead of auto-success
      addDebugLog('✅ Location sent successfully, waiting for server response...');
      
    } catch (error) {
      addDebugLog(`❌ Location capture error: ${error.message}`);
      setErrorMessage(error.message || 'Failed to capture location');
      setAuthState("error");
    }
  }, [sessionId, authData, ws]);

  // Debug WebSocket message function
  const debugWebSocketMessage = (type: string, data: any) => {
    addDebugLog(`📤 Sending ${type} message`);
    addDebugLog(`📤 Data: ${JSON.stringify(data).substring(0, 200)}...`);
    
    // Validate the structure
    if (type === 'passkey_auth_success' || type === 'passkey_created') {
      if (!data.sessionId) {
        addDebugLog('❌ Missing sessionId in message');
      }
      if (!data.authData) {
        addDebugLog('❌ Missing authData in message');
      } else {
        addDebugLog(`✅ authData structure: credential=${!!data.authData.credential}, email=${!!data.authData.userEmail}, device=${!!data.authData.deviceInfo}`);
      }
    }
  };

  // Enhanced WebSocket connection with heartbeat and detailed logging
  const connectWebSocket = React.useCallback(() => {
    const wsUrl = 'wss://labmanagementdatabase.onrender.com';
    
    addDebugLog(`🔗 Attempting WebSocket connection to: ${wsUrl}`);
    addDebugLog(`🔗 Session: ${sessionId}, Email: ${userEmail}, Mode: ${mode}`);
    
    try {
      const websocket = new WebSocket(wsUrl);
      
      // Set up heartbeat to keep connection alive
      let heartbeatInterval: NodeJS.Timeout;
      
      websocket.onopen = () => {
        addDebugLog('✅ Mobile WebSocket connected successfully');
        setWsConnected(true);
        setWs(websocket);
        
        // Start heartbeat
        heartbeatInterval = setInterval(() => {
          if (websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({
              type: 'ping',
              data: { timestamp: Date.now() }
            }));
            addDebugLog('💓 Heartbeat sent');
          }
        }, 30000); // Every 30 seconds
        
        if (sessionId) {
          const registrationMessage = {
            type: 'register_mobile',
            data: {
              sessionId,
              userEmail,
              challenge: Date.now().toString(),
              mode,
              requireLocation
            }
          };
          
          addDebugLog(`📤 Sending mobile registration`);
          addDebugLog(`📤 Registration data: ${JSON.stringify(registrationMessage.data)}`);
          websocket.send(JSON.stringify(registrationMessage));
        } else {
          addDebugLog('❌ No sessionId available for registration');
        }
      };
      
      websocket.onmessage = (event) => {
        try {
          const messageData = JSON.parse(event.data);
          addDebugLog(`🔵 WebSocket message received: ${messageData.type}`);
          
          // Enhanced logging for all message types
          addDebugLog(`🔵 Full message: ${JSON.stringify(messageData, null, 2)}`);
          
          // Log the full message for critical types
          if (['request_location', 'error', 'location_check_complete', 'passkey_verified_confirmed'].includes(messageData.type)) {
            console.log('Full WebSocket message:', messageData);
          }
          
          const { type, data } = messageData;
          
          switch (type) {
            case 'mobile_registered':
              addDebugLog('✅ Mobile registered successfully');
              // Check location permission if required
              if (requireLocation) {
                checkLocationPermission();
              }
              break;
              
            case 'connected':
              addDebugLog(`🔗 Connected with connection ID: ${data?.connectionId}`);
              break;
              
            case 'pong':
              addDebugLog('💓 Heartbeat response received');
              break;
              
            case 'auth_success_confirmed':
            case 'passkey_created_confirmed':
            case 'passkey_verified_confirmed':
              addDebugLog('✅ Authentication confirmed by server');
              addDebugLog(`✅ Server response: ${data?.message}`);
              addDebugLog(`✅ Require location: ${data?.requireLocation}`);
              
              if (requireLocation) {
                addDebugLog('📍 Location required, waiting for location request...');
                setAuthState("processing");
              } else {
                addDebugLog('✅ No location required, setting success state');
                setAuthState("success");
              }
              break;
              
            case 'request_location_from_mobile':
              addDebugLog('🎯 LOCATION REQUEST RECEIVED!');
              addDebugLog(`📍 Request sessionId: ${data?.sessionId}`);
              addDebugLog(`📍 Current sessionId: ${sessionId}`);
              addDebugLog(`📍 WebSocket ready state: ${websocket.readyState}`);
              addDebugLog(`📍 Auth data present: ${!!authData}`);
              addDebugLog(`📍 Request ID: ${data?.requestId}`);
              
              // Verify this is for our session
              if (data?.sessionId === sessionId) {
                addDebugLog('✅ Session ID matches, capturing location...');
                if (websocket && websocket.readyState === WebSocket.OPEN) {
                  // Small delay to ensure state updates
                  setTimeout(() => {
                    captureAndSendLocation();
                  }, 100);
                } else {
                  addDebugLog(`❌ WebSocket not ready: ${websocket?.readyState}`);
                  setErrorMessage('Connection lost during location request');
                  setAuthState("error");
                }
              } else {
                addDebugLog(`❌ Session ID mismatch: expected '${sessionId}', got '${data?.sessionId}'`);
                setErrorMessage('Session mismatch error');
                setAuthState("error");
              }
              break;

            case 'location_check_complete':
              addDebugLog(`🎯 Location check complete: ${data?.success ? 'SUCCESS' : 'FAILED'}`);
              addDebugLog(`🎯 Distance: ${data?.distance}m`);
              addDebugLog(`🎯 Message: ${data?.message}`);
              
              if (data?.success) {
                addDebugLog(`✅ Access granted! Distance: ${data.distance}m`);
                setAuthState("success");
              } else {
                addDebugLog(`❌ Access denied: ${data?.error}`);
                setErrorMessage(data?.error || 'Location check failed');
                setAuthState("error");
              }
              break;

            case 'access_granted':
              addDebugLog('✅ Access granted by server');
              addDebugLog(`✅ Message: ${data?.message}`);
              setAuthState("success");
              break;

            case 'access_denied':
              addDebugLog('❌ Access denied by server');
              addDebugLog(`❌ Message: ${data?.message}`);
              setErrorMessage(data?.message || 'Access denied');
              setAuthState("error");
              break;
              
            case 'error':
              addDebugLog(`❌ Server error: ${data?.message || 'Unknown error'}`);
              addDebugLog(`❌ Error details: ${JSON.stringify(data, null, 2)}`);
              setErrorMessage(data?.message || 'Authentication error');
              setAuthState("error");
              break;
              
            default:
              addDebugLog(`❓ Unknown message type: ${type}`);
              if (data) {
                addDebugLog(`❓ Message data: ${JSON.stringify(data).substring(0, 100)}...`);
              }
              break;
          }
        } catch (error) {
          addDebugLog(`❌ Error parsing message: ${error.message}`);
          addDebugLog(`❌ Raw message: ${event.data}`);
          console.error('❌ Error parsing WebSocket message:', error);
          console.error('❌ Raw message:', event.data);
        }
      };
      
      websocket.onclose = (event) => {
        addDebugLog(`🔌 WebSocket closed: Code ${event.code} - ${event.reason || 'No reason'}`);
        setWsConnected(false);
        setWs(null);
        
        // Clear heartbeat
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          addDebugLog('💓 Heartbeat stopped');
        }
        
        // Don't auto-reconnect to avoid loops
        if (authState !== "success" && authState !== "error") {
          setErrorMessage('Connection lost. Please try again.');
          setAuthState("error");
        }
      };
      
      websocket.onerror = (error) => {
        addDebugLog(`❌ WebSocket error: ${error}`);
        setWsConnected(false);
        setErrorMessage('Connection failed. Please check your internet.');
        setAuthState("error");
      };
      
    } catch (error) {
      addDebugLog(`❌ Failed to create WebSocket: ${error.message}`);
      setWsConnected(false);
      setErrorMessage('Failed to establish connection');
      setAuthState("error");
    }
  }, [sessionId, userEmail, mode, requireLocation, authState, authData, captureAndSendLocation]);

  // Extract URL parameters and connect WebSocket
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const extractedSessionId = urlParams.get('sessionId') || '';
    const extractedUserEmail = urlParams.get('userEmail') || '';
    const extractedLabName = urlParams.get('labName') || urlParams.get('labId') || '';
    const extractedMode = urlParams.get('mode') || 'login';
    const extractedRequireLocation = urlParams.get('requireLocation') === 'true';
    
    setSessionId(extractedSessionId);
    setUserEmail(extractedUserEmail);
    setLabName(extractedLabName);
    setMode(extractedMode);
    setRequireLocation(extractedRequireLocation);
    
    addDebugLog('🔧 URL params extracted');
    addDebugLog(`🔧 Session: ${extractedSessionId}`);
    addDebugLog(`🔧 Email: ${extractedUserEmail}`);
    addDebugLog(`🔧 Mode: ${extractedMode}`);
    addDebugLog(`🔧 Require Location: ${extractedRequireLocation}`);
    
    // Check location permission on load if required
    if (extractedRequireLocation) {
      checkLocationPermission();
    }
  }, []);

  // Connect WebSocket when session ID is available
  useEffect(() => {
    if (sessionId) {
      addDebugLog('🔗 Session ID available, connecting WebSocket in 500ms...');
      const timer = setTimeout(() => {
        connectWebSocket();
      }, 500);
      
      return () => {
        clearTimeout(timer);
        if (ws) {
          addDebugLog('🔌 Cleaning up WebSocket connection');
          ws.close();
        }
      };
    }
  }, [sessionId, connectWebSocket]);

  // Test WebSocket connection
  const testWebSocketConnection = () => {
    if (ws) {
      addDebugLog(`🔗 WebSocket test - State: ${ws.readyState}, URL: ${ws.url}`);
      
      // Send a ping to test connection
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ping',
          data: { timestamp: Date.now(), test: true }
        }));
        addDebugLog('📡 Test ping sent');
      } else {
        addDebugLog(`❌ WebSocket not open: ${ws.readyState}`);
      }
    } else {
      addDebugLog('❌ WebSocket is null');
    }
  };

  // Trigger WebAuthn passkey authentication
  const authenticateWithPasskey = async (): Promise<void> => {
    if (!isWebAuthnSupported()) {
      setErrorMessage("WebAuthn/Passkey is not supported on this device");
      setAuthState("error");
      return;
    }

    // Check location permission first if required
    if (requireLocation && locationPermissionStatus !== 'granted') {
      addDebugLog('📍 Location required but not granted, requesting permission...');
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setErrorMessage("Location access is required for authentication");
        setAuthState("error");
        return;
      }
    }

    setAuthState("authenticating");
    addDebugLog('🔐 Starting passkey authentication...');

    try {
      // Generate authentication challenge
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create WebAuthn assertion request
      const publicKeyCredentialRequestOptions: CredentialRequestOptions = {
        publicKey: {
          challenge: challenge,
          timeout: 60000,
          rpId: window.location.hostname,
          userVerification: "required",
          allowCredentials: []
        }
      };

      addDebugLog('🔐 Requesting WebAuthn credential...');
      
      // Request authentication
      const credential = await navigator.credentials.get(publicKeyCredentialRequestOptions);

      if (credential) {
        addDebugLog(`✅ Passkey authentication successful: ${credential.id}`);
        
        const authInfo = {
          success: true,
          credential: credential.id,
          userEmail,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: Date.now()
          },
          type: "authentication"
        };
        
        setAuthData(authInfo);
        addDebugLog('💾 Auth data saved to state');
        
        // Send authentication success via WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
          const authMessage = {
            type: 'passkey_auth_success',
            data: { 
              sessionId,
              authData: authInfo
            }
          };
          
          debugWebSocketMessage('passkey_auth_success', authMessage.data);
          addDebugLog('📤 Sending auth success to server');
          
          ws.send(JSON.stringify(authMessage));
        } else {
          addDebugLog(`❌ WebSocket not ready for auth success: ${ws?.readyState}`);
          setErrorMessage('Connection lost during authentication');
          setAuthState("error");
          return;
        }
        
        // If location is required, wait for desktop to request it
        if (!requireLocation) {
          setAuthState("success");
        } else {
          addDebugLog('📍 Location required, waiting for desktop request...');
          setAuthState("processing");
        }
      }
    } catch (error: any) {
      addDebugLog(`❌ Authentication failed: ${error.name} - ${error.message}`);
      
      let errorMsg = "Authentication failed";
      if (error.name === "NotAllowedError") {
        errorMsg = "Authentication was cancelled or timed out";
      } else if (error.name === "InvalidStateError") {
        errorMsg = "No passkey found for this device";
      } else if (error.name === "NotSupportedError") {
        errorMsg = "Passkey authentication not supported";
      }
      
      setErrorMessage(errorMsg);
      setAuthState("error");
    }
  };

  // Create a new passkey
  const createPasskey = async (): Promise<void> => {
    if (!isWebAuthnSupported()) {
      setErrorMessage("WebAuthn/Passkey is not supported on this device");
      setAuthState("error");
      return;
    }

    // Check location permission first if required
    if (requireLocation && locationPermissionStatus !== 'granted') {
      addDebugLog('📍 Location required but not granted, requesting permission...');
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setErrorMessage("Location access is required for passkey creation");
        setAuthState("error");
        return;
      }
    }

    setAuthState("authenticating");
    addDebugLog('🆕 Starting passkey creation...');

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      
      const userId = new TextEncoder().encode(userEmail);

      const publicKeyCredentialCreationOptions: CredentialCreationOptions = {
        publicKey: {
          challenge: challenge,
          rp: {
            name: "Lab Access System",
            id: window.location.hostname,
          },
          user: {
            id: userId,
            name: userEmail,
            displayName: userEmail,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" }
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            requireResidentKey: true
          },
          timeout: 60000,
          attestation: "direct"
        }
      };

      addDebugLog('🆕 Creating WebAuthn credential...');
      const credential = await navigator.credentials.create(publicKeyCredentialCreationOptions);

      if (credential) {
        addDebugLog(`✅ Passkey created successfully: ${credential.id}`);
        
        const authInfo = {
          success: true,
          credential: credential.id,
          userEmail,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: Date.now()
          },
          type: "registration"
        };
        
        setAuthData(authInfo);
        addDebugLog('💾 Auth data saved to state');
        
        // Send passkey creation success via WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
          const creationMessage = {
            type: 'passkey_created',
            data: { 
              sessionId,
              authData: authInfo
            }
          };
          
          // Enhanced debugging
          addDebugLog('📤 SENDING CREATION MESSAGE TO SERVER:');
          addDebugLog(`📤 Full message: ${JSON.stringify(creationMessage, null, 2)}`);
          addDebugLog(`📤 Session ID: ${sessionId}`);
          addDebugLog(`📤 Auth data present: ${!!authInfo}`);
          addDebugLog(`📤 Credential: ${authInfo.credential}`);
          addDebugLog(`📤 User email: ${authInfo.userEmail}`);
          
          debugWebSocketMessage('passkey_created', creationMessage.data);
          
          ws.send(JSON.stringify(creationMessage));
          addDebugLog('✅ Creation message sent successfully');
        } else {
          addDebugLog(`❌ WebSocket not ready for creation success: ${ws?.readyState}`);
          setErrorMessage('Connection lost during passkey creation');
          setAuthState("error");
          return;
        }
        
        // If location is required, wait for desktop to request it
        if (!requireLocation) {
          setAuthState("success");
        } else {
          addDebugLog('📍 Location required, waiting for desktop request...');
          setAuthState("processing");
        }
      }
    } catch (error: any) {
      addDebugLog(`❌ Passkey creation failed: ${error.name} - ${error.message}`);
      
      let errorMsg = `${error.name}: ${error.message}`;
      if (error.name === "NotAllowedError") {
        errorMsg = "Passkey creation was cancelled";
      } else if (error.name === "InvalidStateError") {
        errorMsg = "A passkey already exists for this account";
      }
      
      setErrorMessage(errorMsg);
      setAuthState("error");
    }
  };

  const getStateIcon = () => {
    switch (authState) {
      case "ready": return Fingerprint;
      case "authenticating": return Smartphone;
      case "location-capture": return MapPin;
      case "processing": return Shield;
      case "success": return CheckCircle;
      case "error": return AlertCircle;
    }
  };

  const getStateMessage = () => {
    switch (authState) {
      case "ready": return "Ready for authentication";
      case "authenticating": return "Complete biometric authentication";
      case "location-capture": return "Capturing your location...";
      case "processing": return requireLocation ? "Waiting for location request..." : "Processing authentication...";
      case "success": return "Authentication and location capture complete!";
      case "error": return errorMessage || "Authentication failed";
    }
  };

  const StateIcon = getStateIcon();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="fixed top-4 left-4 right-4 bg-black text-green-400 p-4 rounded-lg text-xs font-mono z-50 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold">🔍 Debug Console</span>
            <button 
              onClick={() => setShowDebugPanel(false)}
              className="text-red-400 hover:text-red-300 text-lg"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
            {debugLogs.map((log, index) => (
              <div key={index} className="break-words">{log}</div>
            ))}
          </div>
          <div className="pt-2 border-t border-gray-600 text-blue-400 space-y-1">
            <div>Session: {sessionId || 'Not set'}</div>
            <div>Email: {userEmail || 'Not set'}</div>
            <div>WebSocket: {wsConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
            <div>Auth State: {authState}</div>
            <div>Require Location: {requireLocation ? 'Yes' : 'No'}</div>
            <div>Location Permission: {locationPermissionStatus}</div>
            <div>Auth Data: {authData ? '✅ Set' : '❌ Not set'}</div>
            <div>Location Data: {locationData ? '✅ Set' : '❌ Not set'}</div>
          </div>
        </div>
      )}

      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <StateIcon className="text-white text-2xl" />
          </div>
          
          <CardTitle className="text-xl">
            {mode === 'registration' ? 'Lab Registration' : 'Mobile Authentication'}
          </CardTitle>
          {userEmail && (
            <Badge variant="outline" className="mt-2">{userEmail}</Badge>
          )}
          {labName && (
            <Badge variant="outline" className="mt-1">{labName}</Badge>
          )}
          <div className="flex items-center justify-center mt-2">
            {wsConnected ? (
              <Badge variant="outline" className="border-green-500 text-green-600">
                <Wifi className="mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="border-red-500 text-red-600">
                <WifiOff className="mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {authState === "ready" && (
            <div className="text-center space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  {mode === 'registration' ? 'Setup Authentication' : 'Authenticate with Passkey'}
                </h3>
                <p className="text-sm text-gray-600">
                  {requireLocation 
                    ? 'Complete authentication and location capture for secure access'
                    : 'Use your device\'s biometric authentication'
                  }
                </p>
              </div>

              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  onClick={authenticateWithPasskey}
                >
                  <Fingerprint className="mr-2" />
                  {mode === 'registration' ? 'Authenticate' : 'Authenticate with Passkey'}
                </Button>

                {mode === 'login' && (
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-2">Don't have a passkey yet?</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={createPasskey}
                    >
                      Create New Passkey
                    </Button>
                  </div>
                )}
              </div>

              {requireLocation && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center mb-2">
                    <MapPin className="mr-2 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Location Required</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    Your location will be captured when requested by the desktop application
                  </p>
                  <div className="mt-2 flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      locationPermissionStatus === 'granted' ? 'bg-green-500' : 
                      locationPermissionStatus === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></div>
                    <span className="text-xs text-gray-600">
                      Location: {locationPermissionStatus === 'granted' ? 'Allowed' : 
                                locationPermissionStatus === 'denied' ? 'Denied' : 'Unknown'}
                    </span>
                  </div>
                  {locationPermissionStatus !== 'granted' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={requestLocationPermission}
                      className="w-full mt-2"
                    >
                      <MapPin className="mr-1" />
                      Grant Location Access
                    </Button>
                  )}
                </div>
              )}

              {sessionId && (
                <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                  <p className="text-xs text-gray-600">
                    <strong>Session:</strong> {sessionId.substring(0, 20)}...
                  </p>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowDebugPanel(!showDebugPanel)}
                      className="text-xs flex-1"
                    >
                      {showDebugPanel ? 'Hide' : 'Show'} Debug
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={testWebSocketConnection}
                      className="text-xs flex-1"
                    >
                      Test Connection
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={checkLocationPermission}
                      className="text-xs flex-1"
                    >
                      Check Location
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        addDebugLog('🧪 Manual location test triggered');
                        captureAndSendLocation();
                      }}
                      className="text-xs flex-1"
                    >
                      Test Capture
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {(authState === "authenticating" || authState === "location-capture" || authState === "processing") && (
            <div className="text-center space-y-4">
              <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto"></div>
              <div>
                <h3 className="font-semibold mb-2">
                  {authState === "authenticating" && "Authenticating..."}
                  {authState === "location-capture" && "Capturing Location..."}
                  {authState === "processing" && "Processing..."}
                </h3>
                <p className="text-sm text-gray-600">
                  {getStateMessage()}
                </p>
                {locationData && (authState === "processing" || authState === "location-capture") && (
                  <div className="mt-3 p-2 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700">
                      ✓ Location captured<br/>
                      Accuracy: {Math.round(locationData.accuracy)}m<br/>
                      Lat: {locationData.latitude.toFixed(6)}<br/>
                      Lng: {locationData.longitude.toFixed(6)}
                    </p>
                  </div>
                )}
                {authState === "processing" && requireLocation && !locationData && (
                  <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700">
                      ⏳ Waiting for desktop to request location data...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {authState === "success" && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="text-white text-xl" />
              </div>
              <div>
                <h3 className="font-semibold text-green-600 mb-2">Complete!</h3>
                <p className="text-sm text-gray-600">
                  {mode === 'registration' 
                    ? 'Authentication and location captured successfully! Return to registration page.'
                    : 'Authentication successful! Return to the login page.'
                  }
                </p>
                <div className="mt-3 p-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-700">
                    ✓ Passkey verified<br/>
                    {requireLocation && locationData && (
                      <>
                        ✓ Location captured (±{Math.round(locationData.accuracy)}m)<br/>
                        ✓ Geofence check passed<br/>
                      </>
                    )}
                    ✓ Data sent to {mode === 'registration' ? 'registration' : 'login'} page<br/>
                    → You can close this window
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => window.close()}
              >
                Close Window
              </Button>
            </div>
          )}

          {authState === "error" && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="text-white text-xl" />
              </div>
              <div>
                <h3 className="font-semibold text-red-600 mb-2">Error</h3>
                <p className="text-sm text-gray-600">{getStateMessage()}</p>
              </div>
              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    addDebugLog('🔄 Retry button clicked - resetting state');
                    setAuthState("ready");
                    setErrorMessage("");
                    setLocationData(null);
                    setAuthData(null);
                    // Check location permission again
                    if (requireLocation) {
                      checkLocationPermission();
                    }
                    // Reconnect WebSocket
                    if (sessionId) {
                      addDebugLog('🔗 Reconnecting WebSocket...');
                      setTimeout(connectWebSocket, 1000);
                    }
                  }}
                  className="w-full"
                >
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDebugPanel(true)}
                  className="w-full"
                >
                  Show Debug Info
                </Button>
              </div>
            </div>
          )}

          {!isWebAuthnSupported() && authState === "ready" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Your device may not support passkey authentication. Please ensure you're using a modern browser with biometric capabilities.
              </p>
            </div>
          )}

          {!wsConnected && authState === "ready" && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                <strong>Warning:</strong> Connection lost. Please try refreshing the page or scanning the QR code again.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  addDebugLog('🔄 Manual reconnect triggered');
                  connectWebSocket();
                }}
                className="w-full mt-2"
              >
                Reconnect
              </Button>
            </div>
          )}

          {requireLocation && locationPermissionStatus === 'denied' && authState === "ready" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>Location Required:</strong> Please enable location access in your browser settings to continue with authentication.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={requestLocationPermission}
                className="w-full mt-2"
              >
                <MapPin className="mr-1" />
                Request Location Access
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileAuthWithLocation;