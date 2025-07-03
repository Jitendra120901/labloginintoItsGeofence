// components/layout/SystemRequirements.jsx
import React from 'react';
import { EnvironmentOutlined as MapPin } from '@ant-design/icons';

const SystemRequirements = () => {
  const requirements = [
    "Location access must be enabled in your browser for geofence authentication",
    "Lab employees can only login from within 20 meters of the registered lab location",
    "Lab administrators have global access and can login from any location",
    "All login attempts are logged and monitored for security compliance",
    "Secure password policy enforced: minimum 6 characters with complexity requirements"
  ];

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
        <div className="flex items-start">
          <MapPin className="text-yellow-600 mr-4 mt-1 flex-shrink-0" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">
              System Requirements & Guidelines
            </h3>
            <ul className="text-yellow-700 space-y-2">
              {requirements.map((requirement, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-yellow-600 mr-2 flex-shrink-0">•</span>
                  <span>{requirement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemRequirements;