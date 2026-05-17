import { Navigate, Outlet, Route, Routes, useParams } from "react-router";
import RootLayout from "./layout/RootLayout";
import AdminLayout from "./layout/AdminLayout";
import Home from "./pages/Home";
import AuthLayout from "./layout/AuthLayout";
import AdminSignIn from "./pages/admin/auth/AdminSignIn";
import NotFound from "./pages/NotFound";
import { RequireAuth } from "./components/RequireAuth";
import { RequireSpaceAccess } from "./components/RequireSpaceAccess";
import AdminSignUp from "./pages/admin/auth/AdminSignUp";
import SpaceSelect from "./pages/admin/SpaceSelect";
import RoomSelect from "./pages/admin/RoomSelect";
import Members from "./pages/admin/Members";
import Invitation from "./pages/admin/Invitation";
import LocationEstimatesPage from "./pages/admin/LocationEstimatesPage";
import LocationHeatmapPage from "./pages/admin/LocationHeatmapPage";
import OverviewDashboardPage from "./pages/admin/OverviewDashboardPage";
import Settings from "./pages/admin/Settings";
import RoomCurrent from "./pages/RoomCurrent";

function RoomsRedirect() {
  const { spaceId } = useParams<{ spaceId: string }>();
  return <Navigate to={`/admin/space/${spaceId}/rooms`} replace />;
}

function DashboardRedirect() {
  const { spaceId } = useParams<{ spaceId: string }>();
  return <Navigate to={`/admin/space/${spaceId}/dashboard/overview`} replace />;
}

export default function Router() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        {/* Pages for Average Users */}
        <Route path="/" element={<Home />} />
        <Route path="spaces/:spaceId/rooms/:roomId" element={<RoomCurrent />} />
        <Route path="space/:spaceId/rooms/:roomId" element={<RoomCurrent />} />

        {/* Admin Pages */}
        <Route
          path="admin"
          element={
            <RequireAuth>
              <Outlet />
            </RequireAuth>
          }
        >
          <Route
            element={
              <RequireSpaceAccess>
                <Outlet />
              </RequireSpaceAccess>
            }
          >
            <Route
              path="space/:spaceId/rooms/create"
              element={<RoomsRedirect />}
            />
            <Route element={<AdminLayout />}>
              <Route
                path="space/:spaceId/dashboard"
                element={<DashboardRedirect />}
              />
              <Route
                path="space/:spaceId/dashboard/overview"
                element={<OverviewDashboardPage />}
              />
              <Route
                path="space/:spaceId/dashboard/ble-compare"
                element={<DashboardRedirect />}
              />
              <Route
                path="space/:spaceId/dashboard/location-estimates"
                element={<LocationEstimatesPage />}
              />
              <Route
                path="space/:spaceId/dashboard/location-heatmap"
                element={<LocationHeatmapPage />}
              />
              <Route path="space/:spaceId/rooms" element={<RoomSelect />} />
              <Route
                path="space/:spaceId/rooms/:roomId"
                element={<RoomsRedirect />}
              />
              <Route path="space/:spaceId/members" element={<Members />} />
              <Route path="space/:spaceId/settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="spaces" element={<SpaceSelect />} />
          <Route path="invitations/accept" element={<Invitation />} />
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="/admin/auth/sign-in" element={<AdminSignIn />} />
          <Route path="/admin/auth/sign-up" element={<AdminSignUp />} />
        </Route>

        {/* Not Found Page */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
