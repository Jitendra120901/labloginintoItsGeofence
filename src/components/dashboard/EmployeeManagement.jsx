// components/dashboard/EmployeeManagement.jsx
import React, { useState } from 'react';
import { 
    PlusOutlined as Plus,
    DeleteOutlined as Trash2,
    TeamOutlined as Users
  } from '@ant-design/icons';
import { USER_ROLES, usersAPI } from '../utilis';
import { Alert } from '../common';
import { EmployeeForm } from '../forms';

const EmployeeManagement = ({ user, employees, onEmployeesUpdate }) => {
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmployeeSuccess = () => {
    setShowEmployeeForm(false);
    onEmployeesUpdate();
  };

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (!window.confirm(`Are you sure you want to delete ${employeeName}?`)) return;
    
    setLoading(true);
    try {
      await usersAPI.deleteEmployee(employeeId);
      onEmployeesUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Employee Management</h2>
        {user.role === USER_ROLES.LAB_ADMIN && (
          <button
            onClick={() => setShowEmployeeForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="mr-2" size={16} />
            Add Employee
          </button>
        )}
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      {showEmployeeForm && (
        <EmployeeForm
          onSuccess={handleEmployeeSuccess}
          onCancel={() => setShowEmployeeForm(false)}
        />
      )}

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {employees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees yet</h3>
            <p className="text-gray-500 mb-4">Add your first employee to get started</p>
            {user.role === USER_ROLES.LAB_ADMIN && (
              <button
                onClick={() => setShowEmployeeForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="mr-2" size={16} />
                Add First Employee
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                {user.role === USER_ROLES.LAB_ADMIN && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                <tr key={employee._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {employee.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">ID: {employee.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.email}</div>
                    <div className="text-sm text-gray-500">{employee.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.department}</div>
                    <div className="text-sm text-gray-500">{employee.designation}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.lastLogin 
                      ? new Date(employee.lastLogin).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                  {user.role === USER_ROLES.LAB_ADMIN && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteEmployee(employee._id, employee.name)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 transition-colors"
                        title="Delete Employee"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Employee Statistics */}
      {employees.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Employee Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{employees.length}</p>
              <p className="text-sm text-gray-600">Total Employees</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {employees.filter(emp => emp.isActive).length}
              </p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {employees.filter(emp => emp.lastLogin).length}
              </p>
              <p className="text-sm text-gray-600">Ever Logged In</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {new Set(employees.map(emp => emp.department)).size}
              </p>
              <p className="text-sm text-gray-600">Departments</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;