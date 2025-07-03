// components/dashboard/Navigation.jsx
import React from 'react';
import { 
    LineChartOutlined as Activity,
    TeamOutlined as Users,
    SafetyOutlined as Shield
  } from '@ant-design/icons';
import { DASHBOARD_TABS } from '../utilis';

const Navigation = ({ activeTab, setActiveTab, stats }) => {
  const tabs = [
    { id: DASHBOARD_TABS.OVERVIEW, label: 'Overview', icon: Activity },
    { id: DASHBOARD_TABS.EMPLOYEES, label: 'Employees', icon: Users },
    { id: DASHBOARD_TABS.ACTIVITY, label: 'Login Activity', icon: Shield }
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="mr-2" size={16} />
                {tab.label}
                {/* Badge for notifications */}
                {tab.id === DASHBOARD_TABS.ACTIVITY && stats?.todayStats?.geofenceViolations > 0 && (
                  <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                    {stats.todayStats.geofenceViolations}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;