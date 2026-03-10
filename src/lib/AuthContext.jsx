import { createContext, useState, useContext, useEffect } from 'react';
import api from '@/api/inboxAiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    api.me()
      .then(u => { setUser(u); setIsAuthenticated(true); setIsLoadingAuth(false); })
      .catch(() => { setUser(null); setIsAuthenticated(false); setIsLoadingAuth(false); });
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const result = await api.login(email, password);
      const u = result.user || result;
      setUser(u);
      setIsAuthenticated(true);
      return u;
    } catch (e) {
      setAuthError({ type: 'auth_required', message: e.message });
      throw e;
    }
  };

  const logout = async () => {
    await api.logout().catch(() => {});
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => { setUser(null); setIsAuthenticated(false); };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError,
      login, logout, navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
