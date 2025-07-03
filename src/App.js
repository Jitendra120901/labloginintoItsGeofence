// App.jsx
import React, { useState } from 'react';
import { PAGES } from './components/utilis';
import { useAuth } from './components/hooks';
import { Dashboard } from './components/dashboard';
import { LandingPage } from './components/layout';
import { LoadingSpinner } from './components/common';


const App = () => {
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState(PAGES.LOGIN);
  const [successMessage, setSuccessMessage] = useState('');

  const handleRegistrationSuccess = () => {
    setSuccessMessage('Lab registered successfully! You can now login with your admin credentials.');
    setCurrentPage(PAGES.LOGIN);
    // Auto-scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = (userData, token) => {
    login(userData, token);
  };

  const handleLogout = () => {
    logout();
    setCurrentPage(PAGES.LOGIN);
    setSuccessMessage('');
  };

  // Show loading screen on initial load
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading Lab Management System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {isAuthenticated ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <LandingPage
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          onLogin={handleLogin}
          onRegistrationSuccess={handleRegistrationSuccess}
          successMessage={successMessage}
          setSuccessMessage={setSuccessMessage}
        />
      )}
    </div>
  );
};

export default App;