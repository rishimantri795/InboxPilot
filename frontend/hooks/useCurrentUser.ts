import useSWR from "swr";
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
  RagQueued?: string;
}

interface ResponseData {
  user?: User;
}

const fetcher = (url: string) => axios.get(url, { withCredentials: true }).then((res) => res.data);

const useCurrentUser = (initialUserData?: User) => {
  const { data, error, mutate } = useSWR<ResponseData>(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/current-user`, fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnMount: !initialUserData,
    fallbackData: initialUserData ? { user: initialUserData } : undefined,
  });

  const clearUser = async () => {
    try {
      // Call logout endpoint
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/logout`, {}, { withCredentials: true });
      // Update the local state
      await mutate({ user: null }, false);
    } catch (err) {
      console.error("Error during logout:", err);
      throw err;
    }
  };

  return {
    user: data?.user || null,
    loading: !data && !error,
    error,
    clearUser,
    mutate,
  };
};

export default useCurrentUser;
