// components/PermissionGate.tsx
"use client";

import React from 'react';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/lib/roles';

interface PermissionGateProps {
  workspaceId?: string;
  permission: keyof Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// Component that only renders children if user has permission
export const PermissionGate: React.FC<PermissionGateProps> = ({
  workspaceId = '',
  permission,
  fallback = null,
  children,
}) => {
  const { permissions, loading } = useWorkspacePermissions(workspaceId);

  if (loading) {
    return <div className="animate-pulse bg-slate-200 h-8 rounded" />;
  }

  if (!permissions[permission]) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Button component that's automatically disabled based on permissions
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  workspaceId?: string;
  permission: keyof Permission;
  children: React.ReactNode;
  disabledTooltip?: string;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  workspaceId = '',
  permission,
  children,
  disabledTooltip,
  disabled,
  className = '',
  ...props
}) => {
  const { permissions, loading } = useWorkspacePermissions(workspaceId);

  const hasPermission = permissions[permission];
  const isDisabled = loading || disabled || !hasPermission;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={!hasPermission ? disabledTooltip : props.title}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};

// Hook for easy permission checking in components
export const usePermission = (workspaceId: string, permission: keyof Permission) => {
  const { permissions, loading, error } = useWorkspacePermissions(workspaceId);
  
  return {
    hasPermission: permissions[permission] || false,
    loading,
    error,
  };
};

// Role badge component
interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md' | 'lg';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const getColorClasses = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'editor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-medium capitalize
        ${sizeClasses[size]} ${getColorClasses(role)}
      `}
    >
      {role}
    </span>
  );
};

// Permission summary component for debugging/admin
interface PermissionSummaryProps {
  workspaceId: string;
}

export const PermissionSummary: React.FC<PermissionSummaryProps> = ({ workspaceId }) => {
  const { role, permissions, overrides, loading, error } = useWorkspacePermissions(workspaceId);

  if (loading) return <div>Loading permissions...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="panel p-4 text-sm">
      <h3 className="font-semibold mb-2">Your Permissions</h3>
      <p className="mb-2">Role: <RoleBadge role={role || 'none'} size="sm" /></p>
      
      {overrides && Object.keys(overrides).length > 0 && (
        <div className="mb-2">
          <p className="font-medium text-orange-600">Permission Overrides:</p>
          <ul className="list-disc list-inside text-orange-700">
            {Object.entries(overrides).map(([key, value]) => (
              <li key={key}>
                {key}: {value ? '✅ Allowed' : '❌ Denied'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {Object.entries(permissions).map(([key, value]) => (
          <div key={key} className={`p-2 rounded text-xs ${value ? 'bg-green-50' : 'bg-red-50'}`}>
            <span className={value ? 'text-green-700' : 'text-red-700'}>
              {value ? '✅' : '❌'} {key.replace('can_', '').replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
