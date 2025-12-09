import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { refreshToken as callRefreshToken } from '../utils/authRefresh';

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
    localStorage.removeItem('refreshToken');
    setUser(null);
    setIsLogin(false);
  }, []);

  const decodeAndSetUser = useCallback(
    (token) => {
      const decoded = jwtDecode(token);
      const roles = Array.isArray(decoded.roles)
        ? decoded.roles
        : decoded.roles
          ? [decoded.roles].flat()
          : [];

      const baseUser = {
        id: decoded.sub ? Number(decoded.sub) : null,
        email: decoded.email || '',
        displayName: decoded.displayName || decoded.name || '',
        avatarUrl: decoded.avatarUrl || '',
        roles,
      };

      setUser(baseUser);
      setIsLogin(true);
    },
    [setUser, setIsLogin],
  );

  const handleRefreshToken = useCallback(async () => {
    const refresh = localStorage.getItem('refreshToken');
    if (!refresh) {
      throw new Error('Missing refresh token');
    }
    const data = await callRefreshToken();
    const newAccess = data?.accessToken || data?.data?.accessToken;
    const newRefresh = data?.refreshToken || data?.data?.refreshToken;
    if (!newAccess) {
      throw new Error('Refresh token không hợp lệ');
    }
    localStorage.setItem('accessToken', newAccess);
    if (newRefresh) {
      localStorage.setItem('refreshToken', newRefresh);
    }
    return newAccess;
  }, []);

  const checkTokenAndSetUser = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const refresh = localStorage.getItem('refreshToken');

      const ensureValidToken = async () => {
        if (!token && refresh) {
          const refreshedToken = await handleRefreshToken();
          return refreshedToken;
        }
        if (!token) {
          return null;
        }
        const decodedToken = jwtDecode(token);
        const now = Date.now() / 1000;
        if (decodedToken.exp && decodedToken.exp < now) {
          if (!refresh) {
            return null;
          }
          const refreshedToken = await handleRefreshToken();
          return refreshedToken;
        }
        return token;
      };

      const validToken = await ensureValidToken();
      if (!validToken) {
        clearState();
        return;
      }

      const decoded = jwtDecode(validToken);
      const now = Date.now() / 1000;
      if (decoded.exp && decoded.exp < now) {
        clearState();
        return;
      }
      decodeAndSetUser(validToken);
    } catch (err) {
      console.error('Failed to decode token', err);
      clearState();
    } finally {
      setLoading(false);
    }
  }, [clearState, decodeAndSetUser, handleRefreshToken]);

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
