// components/dashboard/Header.jsx
import React from 'react';
import { 
    LogoutOutlined as LogOut,
    SafetyOutlined as Shield
  } from '@ant-design/icons';

const Header = ({ user, onLogout, stats }) => {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lab Management Dashboard</h1>
            <p className="text-gray-600">Welcome, {user.name} ({user.role.replace('_', ' ')})</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Notification Badge */}
            <div className="relative">
              <Shield className="text-gray-400" size={24} />
              {stats?.todayStats?.geofenceViolations > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {stats.todayStats.geofenceViolations}
                </span>
              )}
            </div>
            
            {/* User Profile */}
            <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm">
                <div className="font-medium">{user.name}</div>
                <div className="text-gray-500">{user.role.replace('_', ' ')}</div>
              </div>
            </div>
            
            <button
              onClick={onLogout}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <LogOut className="mr-2" size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;