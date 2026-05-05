// components/RequireAuth.tsx
import { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router';
import { useUser } from '../../hooks/useUser';
import { Loader } from '@mantine/core';
import type { User } from '../../types/user';

interface RequireAuthProps {
  children?: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { data: user, isLoading } = useUser() as { data: User | undefined; isLoading: boolean };
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
