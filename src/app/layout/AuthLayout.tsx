import { Outlet } from "react-router";
import { RedirectIfLoggedIn } from "../components/RedirectIfLoggedIn";

export default function AuthLayout() {
  return (
    <RedirectIfLoggedIn>
      <Outlet />
    </RedirectIfLoggedIn>
  );
}
