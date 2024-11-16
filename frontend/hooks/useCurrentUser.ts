import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  rules: Record<string, Record<string, string>>;
  refreshToken?: string;
  createdAt?: string;
}

interface ResponseData {
  user?: User;
}

const useCurrentUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response: { data: ResponseData } = await axios.get("http://localhost:3010/api/users/current-user", {
          withCredentials: true,
        });

        if (response.data.user) {
          console.log(response.data.user);
          const mappedUser: User = {
            id: response.data.user.id,
            email: response.data.user.email,
            rules: response.data.user.rules,
            refreshToken: response.data.user.refreshToken,
            createdAt: response.data.user.createdAt,
          };
          setUser(mappedUser);
          console.log("Authenticated user:", mappedUser);
        } else {
          setUser(null);
          console.log("No authenticated user.");
        }
      } catch (err) {
        console.error("Error fetching current user:", err);
        setUser(null);
        setError("Failed to fetch user data.");
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const clearUser = useCallback(() => {
    setUser(null);
  }, []);

  return { user, loading, error, clearUser };
};

export default useCurrentUser;
