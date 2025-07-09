// components/layout/LandingPage.jsx
import React from 'react';
import { PAGES } from '../utilis';
import { Alert } from '../common';
import { LabRegistration, Login } from '../auth';

const LandingPage = ({ currentPage, setCurrentPage, onLogin, onRegistrationSuccess, successMessage, setSuccessMessage }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Lab Management System</h1>
        <p className="text-xl text-gray-600 mb-8">Secure geofence-based laboratory access management</p>
        
        {/* Navigation */}
        <div className="flex justify-center space-x-4 mb-6">
          <button
            onClick={() => setCurrentPage(PAGES.REGISTER)}
            className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
              currentPage === PAGES.REGISTER
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 hover:shadow-md'
            }`}
          >
            Register New Lab
          </button>
          <button
            onClick={() => setCurrentPage(PAGES.LOGIN)}
            className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
              currentPage === PAGES.LOGIN
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50 hover:shadow-md'
            }`}
          >
            Login to Dashboard
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="max-w-4xl mx-auto mb-6">
          <Alert type="success" onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        </div>
      )}

      {/* Page Content */}
      {currentPage === PAGES.REGISTER && (
        <LabRegistration onSuccess={onRegistrationSuccess} />
      )}

      {currentPage === PAGES.LOGIN && (
        <Login onLogin={onLogin} />
      )}
  
    </div>

  );
};

export default LandingPage;