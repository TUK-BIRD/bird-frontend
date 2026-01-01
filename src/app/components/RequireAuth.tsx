// components/RequireAuth.tsx
import { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import type { User } from '../../types/auth';
import { Loader } from '@mantine/core';

interface RequireAuthProps {
  children?: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { data: user, isLoading } = useAuth() as { data: User | undefined; isLoading: boolean };
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/admin/auth/sign-in', { 
        state: { from: location }, 
        replace: true 
      });
    }
  }, [isLoading, user, navigate, location]);

  if (isLoading) return <Loader />;
  if (!user) return null;

  return children ? <>{children}</> : <Outlet />;
}
