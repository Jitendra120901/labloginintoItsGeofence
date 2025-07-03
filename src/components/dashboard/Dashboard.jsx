// components/dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { DASHBOARD_TABS, dashboardAPI, usersAPI } from '../utilis';
import { Alert, LoadingSpinner } from '../common';
import Overview from './Overview';
import EmployeeManagement from './EmployeeManagement';
import ActivityMonitor from './ActivityMonitor';
import Header from './Header';
import Navigation from './Navigation';
const Dashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState(DASHBOARD_TABS.OVERVIEW);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loginAttempts, setLoginAttempts] = useState([]);
  const [labInfo, setLabInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (activeTab === DASHBOARD_TABS.OVERVIEW) {
        const [statsRes, labRes] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getLabInfo()
        ]);
        setStats(statsRes);
        setLabInfo(labRes);
      } else if (activeTab === DASHBOARD_TABS.EMPLOYEES) {
        const employeesRes = await usersAPI.getEmployees();
        setEmployees(employeesRes);
      } else if (activeTab === DASHBOARD_TABS.ACTIVITY) {
        const [attemptsRes, employeesRes] = await Promise.all([
          usersAPI.getLoginAttempts(),
          usersAPI.getEmployees()
        ]);
        setLoginAttempts(attemptsRes.loginAttempts || []);
        setEmployees(employeesRes);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeesUpdate = () => {
    loadDashboardData();
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner size="lg" text="Loading dashboard data..." />;
    }

    switch (activeTab) {
      case DASHBOARD_TABS.OVERVIEW:
        return <Overview stats={stats} labInfo={labInfo} />;
      case DASHBOARD_TABS.EMPLOYEES:
        return (
          <EmployeeManagement
            user={user}
            employees={employees}
            onEmployeesUpdate={handleEmployeesUpdate}
          />
        );
      case DASHBOARD_TABS.ACTIVITY:
        return <ActivityMonitor loginAttempts={loginAttempts} employees={employees} />;
      default:
        return <Overview stats={stats} labInfo={labInfo} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={user} onLogout={onLogout} stats={stats} />
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              © 2025 Lab Management System. All rights reserved.
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Connected to: {labInfo?.name || 'Loading...'}</span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                Online
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;