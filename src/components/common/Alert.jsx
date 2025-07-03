// components/common/Alert.jsx
import React from 'react';
import { 
    CheckCircleOutlined as CheckCircle,
    CloseCircleOutlined as XCircle,
    ExclamationCircleOutlined as AlertTriangle,
    InfoCircleOutlined as Info,
    CloseOutlined as X
  } from '@ant-design/icons';

const Alert = ({ type = 'info', children, onClose, className = '' }) => {
  const config = {
    success: {
      bgColor: 'bg-green-50 border-green-200 text-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-600'
    },
    error: {
      bgColor: 'bg-red-50 border-red-200 text-red-800',
      icon: XCircle,
      iconColor: 'text-red-600'
    },
    warning: {
      bgColor: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600'
    },
    info: {
      bgColor: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: Info,
      iconColor: 'text-blue-600'
    }
  };

  const { bgColor, icon: Icon, iconColor } = config[type];

  return (
    <div className={`border-l-4 p-4 ${bgColor} mb-4 rounded-r-lg ${className}`}>
      <div className="flex items-start">
        <Icon className={`mr-3 mt-0.5 ${iconColor}`} size={20} />
        <div className="flex-1">{children}</div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;