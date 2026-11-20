import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { getAuthToken, getStoredUser, setAuth, clearAuth, isAuthRemembered } from '../utils/authStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch latest user profile from backend and keep storage in sync
  const fetchUser = async (token) => {
    const authToken = token || getAuthToken();
    if (!authToken) return null;
    try {
      const { data } = await axios.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUser(data);
      setAuth(authToken, data, isAuthRemembered());
      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      return data;
    } catch (error) {
      console.error('Error fetching user:', error);
      const status = error?.response?.status;
      // Only clear auth for real auth failures; keep session on transient/network errors
      if (status === 401 || status === 403) {
        clearAuth({ keepRememberedEmail: true });
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
      }
      return null;
    }
  };

  // Restore auth session on page load (supports "Remember me": localStorage vs sessionStorage)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = getAuthToken();
        const savedUser = getStoredUser();

        if (!token) {
          delete axios.defaults.headers.common['Authorization'];
          if (mounted) setUser(null);
          return;
        }

        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        if (savedUser) {
          if (mounted) setUser(savedUser);
          // Revalidate in background to keep data fresh without blocking UI
          fetchUser(token);
          return;
        }

        // Token exists but cached user missing/corrupt: block until profile resolves
        await fetchUser(token);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Login Function
  const login = async (email, password, rememberMe = true) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const data = response.data;

      if (data?.token && data?._id) {
        setUser(data);
        setAuth(data.token, data, !!rememberMe);
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        toast.success(`Login successful! Welcome ${data.name || ''}`.trim());
        return true;
      }

      toast.error('Invalid response from server');
      return false;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(message);
      return false;
    }
  };

  // Register Function
  const register = async (name, email, password, rememberMe = true) => {
    try {
      const response = await axios.post('/api/auth/register', { name, email, password });
      const data = response.data;

      if (data?.token && data?._id) {
        setUser(data);
        setAuth(data.token, data, !!rememberMe);
        axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        toast.success('Account created successfully!');
        return true;
      }

      toast.error('Registration failed');
      return false;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return false;
    }
  };

  const refreshUser = async () => {
    const token = getAuthToken();
    if (token) {
      await fetchUser(token);
    }
  };

  // Logout Function
  const logout = () => {
    // Keep remembered email for convenience; clear auth/session tokens and user data
    clearAuth({ keepRememberedEmail: true });
    // Keep vv-cart so guest checkout can continue after logout if desired
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, getAuthToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);