// components/dashboard/Overview.jsx
import React from 'react';
import { 
  TeamOutlined as Users,
  LineChartOutlined as Activity,
  SafetyOutlined as Shield,
  EnvironmentOutlined as MapPin
} from '@ant-design/icons';

const StatCard = ({ icon: Icon, title, value, bgColor, textColor }) => (
  <div className={`${bgColor} rounded-lg p-6`}>
    <div className="flex items-center">
      <Icon className={`${textColor} mr-3`} style={{ fontSize: '24px' }} />
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      </div>
    </div>
  </div>
);

const Overview = ({ stats, labInfo }) => {
  if (!stats || !labInfo) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading overview data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lab Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Lab Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>Name:</strong> {labInfo.name}</p>
            <p><strong>Address:</strong> {labInfo.address}</p>
            <p><strong>Phone:</strong> {labInfo.phone}</p>
          </div>
          <div>
            <p><strong>Registration:</strong> {labInfo.registrationNumber}</p>
            <p><strong>Admin:</strong> {labInfo.adminName}</p>
            <p><strong>Geofence:</strong> {labInfo.geofence?.radius || 20}m radius</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          title="Total Employees"
          value={stats.totalEmployees}
          bgColor="bg-blue-50"
          textColor="text-blue-600"
        />
        
        <StatCard
          icon={Activity}
          title="Active Employees"
          value={stats.activeEmployees}
          bgColor="bg-green-50"
          textColor="text-green-600"
        />

        <StatCard
          icon={Shield}
          title="Today's Logins"
          value={stats.todayStats?.successfulLogins || 0}
          bgColor="bg-yellow-50"
          textColor="text-yellow-600"
        />

        <StatCard
          icon={MapPin}
          title="Geofence Violations"
          value={stats.todayStats?.geofenceViolations || 0}
          bgColor="bg-red-50"
          textColor="text-red-600"
        />
      </div>

      {/* Recent Activity */}
      {stats.recentLoginAttempts && stats.recentLoginAttempts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Login Attempts</h2>
          <div className="space-y-3">
            {stats.recentLoginAttempts.map((attempt) => (
              <div key={attempt._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium">
                    {attempt.userId?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{attempt.userId?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{new Date(attempt.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    attempt.isSuccessful 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {attempt.isSuccessful ? 'Success' : 'Failed'}
                  </span>
                  <span className="text-xs text-gray-500">{attempt.distanceFromLab}m</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Today's Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{stats.todayStats?.totalAttempts || 0}</p>
            <p className="text-sm text-gray-600">Total Attempts</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{stats.todayStats?.successfulLogins || 0}</p>
            <p className="text-sm text-gray-600">Successful</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.todayStats?.failedLogins || 0}</p>
            <p className="text-sm text-gray-600">Failed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{stats.todayStats?.geofenceViolations || 0}</p>
            <p className="text-sm text-gray-600">Violations</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;