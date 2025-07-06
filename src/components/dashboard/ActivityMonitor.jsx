// components/dashboard/ActivityMonitor.jsx
import React, { useState } from 'react';
import { 
    LineChartOutlined as Activity,
    FilterOutlined as Filter
  } from '@ant-design/icons';

const ActivityMonitor = ({ loginAttempts, employees }) => {
  const [filters, setFilters] = useState({
    dateRange: 'today',
    status: 'all',
    employeeId: 'all'
  });

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const getStatusBadge = (attempt) => {
    if (attempt.isSuccessful) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Success</span>;
    }
    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Failed</span>;
  };

  const getFailureReason = (attempt) => {
    if (attempt.isSuccessful) return 'N/A';
    
    const reasons = {
      'invalid_credentials': 'Invalid Credentials',
      'outside_geofence': 'Outside Geofence',
      'account_inactive': 'Account Inactive'
    };
    
    return reasons[attempt.failureReason] || attempt.failureReason || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Login Activity</h2>
      
      {/* Activity Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Filter className="mr-2" size={20} />
          <h3 className="text-lg font-semibold">Activity Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select 
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All attempts</option>
              <option value="success">Successful only</option>
              <option value="failed">Failed only</option>
              <option value="geofence">Geofence violations</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select 
              value={filters.employeeId}
              onChange={(e) => handleFilterChange('employeeId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All employees</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loginAttempts.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No login attempts yet</h3>
            <p className="text-gray-500">Login activity will appear here once employees start logging in</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loginAttempts.map((attempt) => (
                <tr key={attempt._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-medium">
                          {attempt.userId?.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {attempt.userId?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {attempt.userId?.email || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(attempt.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(attempt.timestamp).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(attempt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {attempt.distanceFromLab}m
                    </div>
                    <div className="text-sm text-gray-500">
                      {attempt.isWithinGeofence ? 'Within bounds' : 'Outside bounds'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getFailureReason(attempt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      Lat: {attempt.attemptLocation?.latitude?.toFixed(4) || 'N/A'}
                    </div>
                    <div>
                      Lng: {attempt.attemptLocation?.longitude?.toFixed(4) || 'N/A'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Activity Summary */}
      {loginAttempts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Activity Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{loginAttempts.length}</p>
              <p className="text-sm text-gray-600">Total Attempts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {loginAttempts.filter(attempt => attempt.isSuccessful).length}
              </p>
              <p className="text-sm text-gray-600">Successful</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {loginAttempts.filter(attempt => !attempt.isSuccessful).length}
              </p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {loginAttempts.filter(attempt => !attempt.isWithinGeofence).length}
              </p>
              <p className="text-sm text-gray-600">Geofence Violations</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityMonitor;