import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';

export const UserContext = createContext({
  user: null,
  isLogin: false,
  loading: true,
  setUser: () => {},
  setIsLogin: () => {},
  logout: () => {},
  checkTokenAndSetUser: () => {},
});

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearState = useCallback(() => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setIsLogin(false);
  }, []);

  const checkTokenAndSetUser = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    if (!token) {
      clearState();
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const now = Date.now() / 1000;
      if (decoded.exp && decoded.exp < now) {
        console.warn('Token da het han');
        clearState();
        setLoading(false);
        return;
      }

      const roles = Array.isArray(decoded.roles)
        ? decoded.roles
        : decoded.roles
          ? [decoded.roles].flat()
          : [];

      const baseUser = {
        id: decoded.sub ? Number(decoded.sub) : null,
        email: decoded.email || '',
        displayName: decoded.displayName || decoded.name || '',
        roles,
      };

      setUser(baseUser);
      setIsLogin(true);
    } catch (err) {
      console.error('Failed to decode token', err);
      clearState();
    } finally {
      setLoading(false);
    }
  }, [clearState]);

  useEffect(() => {
    checkTokenAndSetUser();
  }, [checkTokenAndSetUser]);

  const logout = useCallback(() => {
    clearState();
  }, [clearState]);

  const contextValue = useMemo(
    () => ({
      user,
      isLogin,
      loading,
      setUser,
      setIsLogin,
      logout,
      checkTokenAndSetUser,
    }),
    [user, isLogin, loading, logout, checkTokenAndSetUser],
  );

  return (
    <UserContext.Provider value={contextValue}>
      {loading ? <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div> : children}
    </UserContext.Provider>
  );
};
