import { useMemo } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router";
import { Loader } from "@mantine/core";
import useSpaces from "@/hooks/useSpaces";

interface RequireSpaceAccessProps {
  children?: React.ReactNode;
  redirectTo?: string;
}

export function RequireSpaceAccess({
  children,
  redirectTo = "/admin/spaces",
}: RequireSpaceAccessProps) {
  const { spaceId } = useParams<{ spaceId: string }>();
  const location = useLocation();
  const { data: spaces, isLoading } = useSpaces();

  const hasAccess = useMemo(() => {
    if (!spaceId || !spaces) return false;
    return spaces.some((space) => String(space.id) === String(spaceId));
  }, [spaceId, spaces]);

  if (isLoading) return <Loader />;
  if (!spaceId || !hasAccess) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
