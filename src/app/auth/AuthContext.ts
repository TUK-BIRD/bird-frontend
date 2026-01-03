import { createContext } from "react";
import type { User } from "../../types/user";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  refetchUser: () => void;
};

export const AuthContext = createContext<AuthContextType | null>(null);
