import { Outlet, Route, Routes } from "react-router";
import RootLayout from "./layout/RootLayout";
import AdminLayout from "./layout/AdminLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/admin/Dashboard";
import AuthLayout from "./layout/AuthLayout";
import AdminSignIn from "./pages/admin/auth/AdminSignIn";
import NotFound from "./pages/NotFound";
import { RequireAuth } from "./components/RequireAuth";
import { RequireSpaceAccess } from "./components/RequireSpaceAccess";
import AdminSignUp from "./pages/admin/auth/AdminSignUp";
import SpaceSelect from "./pages/admin/SpaceSelect";
import RoomSelect from "./pages/admin/RoomSelect";
import RoomCreate from "./pages/admin/RoomCreate";
import Members from "./pages/admin/Members";
import Invitation from "./pages/admin/Invitation";
import RoomFloorPlan from "./pages/admin/RoomFloorPlan";

export default function Router() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        {/* Pages for Average Users */}
        <Route path="/" element={<Home />} />

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
            <Route path="space/:spaceId/rooms/create" element={<RoomCreate />} />
            <Route element={<AdminLayout />}>
              <Route path="space/:spaceId/dashboard" element={<Dashboard />} />
              <Route path="space/:spaceId/rooms" element={<RoomSelect />} />
              <Route
                path="space/:spaceId/rooms/:roomId"
                element={<RoomFloorPlan />}
              />
              <Route path="space/:spaceId/members" element={<Members />} />
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
