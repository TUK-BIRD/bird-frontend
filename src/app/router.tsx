import { Navigate, Outlet, Route, Routes } from "react-router";
import RootLayout from "./layout/RootLayout";
import AdminLayout from "./layout/AdminLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/admin/Dashboard";
import SpaceManagement from "./pages/admin/RoomSelect";
import AuthLayout from "./layout/AuthLayout";
import AdminSignIn from "./pages/admin/auth/AdminSignIn";
import NotFound from "./pages/NotFound";
import { RequireAuth } from "./components/RequireAuth";
import AdminSignUp from "./pages/admin/auth/AdminSignUp";
import SpaceSelect from "./pages/admin/SpaceSelect";
import RoomSelect from "./pages/admin/RoomSelect";
import RoomCreate from "./pages/admin/RoomCreate";

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
          <Route path="spaces" element={<SpaceSelect />} />

          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="space/:spaceId/dashboard" element={<Dashboard />} />
            <Route path="space/:spaceId/rooms" element={<RoomSelect />} />
            <Route path="space/:spaceId/rooms/create" element={<RoomCreate />} />
          </Route>
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
