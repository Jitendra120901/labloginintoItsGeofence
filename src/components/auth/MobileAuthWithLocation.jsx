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

  // WebSocket connection
  const connectWebSocket = React.useCallback(() => {
    const wsUrl = 'wss://labmanagementdatabase.onrender.com';
    
    try {
      const websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('Mobile WebSocket connected');
        setWsConnected(true);
        setWs(websocket);
        
        if (sessionId) {
          websocket.send(JSON.stringify({
            type: 'register_mobile',
            data: {
              sessionId,
              userEmail,
              challenge: Date.now().toString(),
              mode,
              requireLocation
            }
          }));
        }
      };
      
      websocket.onmessage = (event) => {
        try {
          const { type, data } = JSON.parse(event.data);
          console.log('Mobile WebSocket message:', type, data);
          
          switch (type) {
            case 'mobile_registered':
              console.log('Mobile registered successfully');
              break;
              
            case 'auth_success_confirmed':
            case 'passkey_created_confirmed':
              console.log('Authentication confirmed by server');
              if (requireLocation) {
                setAuthState("location-capture");
                setTimeout(() => {
                  captureAndSendLocation();
                }, 500);
              } else {
                setAuthState("success");
              }
              break;
              
            case 'request_location':
              console.log('Desktop requesting location data');
              // Immediately capture and send location when requested
              if (authData) {
                captureAndSendLocation();
              } else {
                console.error('No auth data available for location request');
                setErrorMessage('Authentication data missing');
                setAuthState("error");
              }
              break;
              
            case 'error':
              console.error('WebSocket error:', data.message);
              setErrorMessage(data.message);
              setAuthState("error");
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      websocket.onclose = () => {
        console.log('Mobile WebSocket disconnected');
        setWsConnected(false);
        setWs(null);
      };
      
      websocket.onerror = (error) => {
        console.error('Mobile WebSocket error:', error);
        setWsConnected(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setWsConnected(false);
    }
  }, [sessionId, userEmail, mode, requireLocation, authData]);

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
    
    console.log('Extracted params:', { 
      extractedSessionId, 
      extractedUserEmail, 
      extractedLabName, 
      extractedMode, 
      extractedRequireLocation 
    });
  }, []);

  // Connect WebSocket when session ID is available
  useEffect(() => {
    if (sessionId) {
      const timer = setTimeout(() => {
        connectWebSocket();
      }, 500);
      
      return () => {
        clearTimeout(timer);
        if (ws) {
          ws.close();
        }
      };
    }
  }, [sessionId, connectWebSocket]);

  // Check if WebAuthn is supported
  const isWebAuthnSupported = (): boolean => {
    return typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;
  };

  // Capture location from mobile device
  const captureLocation = async (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported on this device'));
        return;
      }

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
          
          setLocationData(location);
          resolve(location);
        },
        (error) => {
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

  // Updated captureAndSendLocation function - sends auth + location together
  const captureAndSendLocation = async () => {
    try {
      setAuthState("location-capture");
      console.log('Starting location capture...');
      
      const location = await captureLocation();
      console.log('Location captured:', location);
      
      setAuthState("processing");
      
      // Send BOTH authentication data AND location data together
      if (ws && ws.readyState === WebSocket.OPEN) {
        const completeAuthMessage = {
          type: 'passkey_auth_success',
          data: {
            sessionId,
            authData: authData,
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              altitude: location.altitude,
              timestamp: location.timestamp
            }
          },
          message: "Passkey authentication and location capture successful",
          authData: authData,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            altitude: location.altitude,
            timestamp: location.timestamp
          },
          nextStep: "complete"
        };
        
        console.log('Sending complete auth + location to desktop:', completeAuthMessage);
        ws.send(JSON.stringify(completeAuthMessage));
        
        // Add a small delay before showing success
        setTimeout(() => {
          setAuthState("success");
        }, 1000);
      } else {
        throw new Error('WebSocket not connected');
      }
      
    } catch (error) {
      console.error('Location capture error:', error);
      setErrorMessage(error.message || 'Failed to capture location');
      setAuthState("error");
    }
  };

  // Trigger WebAuthn passkey authentication
  const authenticateWithPasskey = async (): Promise<void> => {
    if (!isWebAuthnSupported()) {
      setErrorMessage("WebAuthn/Passkey is not supported on this device");
      setAuthState("error");
      return;
    }

    setAuthState("authenticating");

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

      // Request authentication
      const credential = await navigator.credentials.get(publicKeyCredentialRequestOptions);

      if (credential) {
        console.log("Passkey authentication successful", credential);
        
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
        
        // Send authentication success via WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'passkey_auth_success',
            data: { 
              sessionId,
              authData: authInfo
            },
            message: "Passkey authentication successful. Checking location...",
            authData: authInfo,
            nextStep: "location_check"
          }));
        }
        
        // If location is required, capture it immediately after authentication
        if (requireLocation) {
          console.log('Location required, capturing automatically...');
          setTimeout(() => {
            captureAndSendLocation();
          }, 500);
        } else {
          setAuthState("success");
        }
      }
    } catch (error: any) {
      console.error("Authentication failed:", error);
      
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

    setAuthState("authenticating");

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

      const credential = await navigator.credentials.create(publicKeyCredentialCreationOptions);

      if (credential) {
        console.log("Passkey created successfully", credential);
        
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
        
        // Send passkey creation success via WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'passkey_created',
            data: { 
              sessionId,
              authData: authInfo
            },
            message: "Passkey created successfully. Checking location...",
            authData: authInfo,
            nextStep: "location_check"
          }));
        }
        
        // If location is required, capture it immediately
        if (requireLocation) {
          setTimeout(() => {
            captureAndSendLocation();
          }, 500);
        } else {
          setAuthState("success");
        }
      }
    } catch (error: any) {
      console.error("Passkey creation failed:", error);
      
      let errorMsg = "Failed to create passkey";
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
      case "processing": return "Processing authentication and location...";
      case "success": return "Authentication and location capture complete!";
      case "error": return errorMessage || "Authentication failed";
    }
  };

  const StateIcon = getStateIcon();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
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
                    Your location will be captured after authentication for security verification
                  </p>
                </div>
              )}

              {sessionId && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600">
                    <strong>Session:</strong> {sessionId.substring(0, 20)}...
                  </p>
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
                {locationData && authState === "processing" && (
                  <div className="mt-3 p-2 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700">
                      ✓ Location captured<br/>
                      Accuracy: {Math.round(locationData.accuracy)}m<br/>
                      Lat: {locationData.latitude.toFixed(6)}<br/>
                      Lng: {locationData.longitude.toFixed(6)}
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
              <Button 
                onClick={() => {
                  setAuthState("ready");
                  setErrorMessage("");
                  setLocationData(null);
                  setAuthData(null);
                }}
              >
                Try Again
              </Button>
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileAuthWithLocation;