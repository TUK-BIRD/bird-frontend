import { useUser } from "../../hooks/useUser";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: user, isLoading, refetch } = useUser();

  return (
    <AuthContext.Provider value={{ user: user ?? null, loading: isLoading, refetchUser: refetch }}>
      {children}
    </AuthContext.Provider>
  );
};
