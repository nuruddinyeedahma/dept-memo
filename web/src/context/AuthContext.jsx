import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password, rememberMe) {
    const loggedIn = await authApi.login(username, password, rememberMe);
    setUser(loggedIn);
    return loggedIn;
  }

  async function logout() {
    await authApi.logout();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
