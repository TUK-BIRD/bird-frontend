import { Navigate, Route, Routes } from "react-router";
import RootLayout from "./layout/RootLayout";
import AdminLayout from "./layout/AdminLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/admin/Dashboard";
import SpaceManagement from "./pages/admin/SpaceManagement";
import AuthLayout from "./layout/AuthLayout";
import AdminSignIn from "./pages/admin/auth/AdminSignIn";
import NotFound from "./pages/NotFound";
import { RequireAuth } from "./components/RequireAuth";
import AdminSignUp from "./pages/admin/auth/AdminSignUp";

export default function Router() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        {/* Pages for Average Users */}
        <Route path="/" element={<Home />} />

        {/* Admin Pages */}
        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route path="admin">
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="manage-space" element={<SpaceManagement />} />
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
