// components/layout/FeatureSection.jsx
import React from 'react';
import { 
    SafetyOutlined as Shield,
    TeamOutlined as Users,
    LineChartOutlined as Activity
  } from '@ant-design/icons';

const FeatureCard = ({ icon: Icon, title, description, bgColor, iconColor }) => (
  <div className="text-center group">
    <div className={`${bgColor} rounded-full p-4 w-20 h-20 mx-auto mb-4 group-hover:scale-110 transition-transform duration-200`}>
      <Icon className={`w-12 h-12 ${iconColor} mx-auto`} />
    </div>
    <h3 className="text-xl font-semibold mb-3 text-gray-900">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
);

const FeatureSection = () => {
  const features = [
    {
      icon: Shield,
      title: "Geofence Security",
      description: "Advanced GPS-based authentication with 20-meter radius geofencing. Employees can only access the system from within lab premises.",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600"
    },
    {
      icon: Users,
      title: "Employee Management",
      description: "Comprehensive employee lifecycle management with role-based access control, department assignments, and real-time status tracking.",
      bgColor: "bg-green-100",
      iconColor: "text-green-600"
    },
    {
      icon: Activity,
      title: "Activity Monitoring",
      description: "Real-time tracking of all login attempts, geofence violations, and comprehensive audit trails for security compliance.",
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600"
    }
  ];

  return (
    <div className="max-w-6xl mx-auto mt-16">
      <div className="bg-white rounded-xl shadow-xl p-8">
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">System Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeatureSection;