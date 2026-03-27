import { createContext, useEffect, useMemo, useState } from "react";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("smartspend_token"));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("smartspend_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem("smartspend_token", token);
    } else {
      localStorage.removeItem("smartspend_token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("smartspend_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("smartspend_user");
    }
  }, [user]);

  const value = useMemo(
    () => ({
      token,
      user,
      login: (payload) => {
        setToken(payload.token);
        setUser(payload.user);
      },
      logout: () => {
        setToken(null);
        setUser(null);
      },
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
