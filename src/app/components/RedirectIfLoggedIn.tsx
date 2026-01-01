// components/RedirectIfLoggedIn.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../hooks/useAuth";

interface RedirectIfLoggedInProps {
  children: React.ReactNode;
}

export function RedirectIfLoggedIn({ children }: RedirectIfLoggedInProps) {
  const { data: user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/admin", { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading) return <div>로딩 중...</div>;
  if (user) return null; // 리다이렉트 중

  return <>{children}</>;
}
