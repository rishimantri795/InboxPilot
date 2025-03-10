// import useSWR from "swr";
// import axios from "axios";

// interface User {
//   id: string;
//   email: string;
//   name: string;
//   rules: Record<string, Record<string, string>>;
//   refreshToken?: string;
//   createdAt?: string;
//   RAG?: string;
//   profile?: string;
// }

// interface ResponseData {
//   user?: User;
// }

// const fetcher = (url: string) =>
//   axios.get(url, { withCredentials: true }).then((res) => res.data);

// const useCurrentUser = (initialUserData?: User) => {
//   const { data, error, mutate } = useSWR<ResponseData>(
//     `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/current-user`,
//     fetcher,
//     {
//       revalidateOnFocus: false,
//       revalidateIfStale: false,
//       revalidateOnMount: !initialUserData,
//       fallbackData:
//         initialUserData !== undefined ? { user: initialUserData } : undefined,
//     }
//   );

//   const clearUser = async () => {
//     await mutate({ user: null }, false);
//   };

//   return {
//     user: data?.user || null,
//     loading: !data && !error,
//     error,
//     clearUser,
//     mutate,
//   };
// };

// export default useCurrentUser;

import { useState, useEffect, useCallback } from "react";
import axios from "axios";

interface User {
  id: string;
  email: string;
  name: string;
  rules: Record<string, Record<string, string>>;
  refreshToken?: string;
  createdAt?: string;
  RAG?: string;
  profile?: string;
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
        const response: { data: ResponseData } = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/current-user`,
          {
            withCredentials: true,
          }
        );

        if (response.data.user) {
          const mappedUser: User = {
            id: response.data.user.id,
            email: response.data.user.email,
            name: response.data.user.name,
            rules: response.data.user.rules,
            refreshToken: response.data.user.refreshToken,
            createdAt: response.data.user.createdAt,
            profile: response.data.user.profile,
            RAG: response.data.user.RAG,
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