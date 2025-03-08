"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import useCurrentUser from "@/hooks/useCurrentUser";

export interface User {
  id: string;
  email: string;
  name: string;
  rules: Record<string, Record<string, string>>;
  refreshToken?: string;
  createdAt?: string;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: any;
  clearUser: () => Promise<void>;
  mutate: any;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({
  children,
  initialUserData,
}: {
  children: ReactNode;
  initialUserData?: User;
}) {
  const { user, loading, error, clearUser, mutate } = useCurrentUser(initialUserData);
  const value = useMemo(() => ({
    user, loading, error, clearUser, mutate
  }), [user, loading, error, clearUser, mutate]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserContext must be used within a UserProvider");
  }
  return context;
}
