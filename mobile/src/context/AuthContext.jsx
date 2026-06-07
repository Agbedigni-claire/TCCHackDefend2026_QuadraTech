import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_BASE_URL } from '../constants/config';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes

const AuthContext = createContext(null);

// SecureStore helpers — drop-in replacements for AsyncStorage
async function secureGet(key)       { return SecureStore.getItemAsync(key); }
async function secureSet(key, val)  { return SecureStore.setItemAsync(key, val); }
async function secureDel(...keys)   { return Promise.all(keys.map(k => SecureStore.deleteItemAsync(k))); }

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [locked,  setLocked]  = useState(false);

  const backgroundTime = useRef(null);
  const appState       = useRef(AppState.currentState);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      const token = await secureGet('access');
      if (token) {
        try {
          const { data } = await axios.get(`${API_BASE_URL}/api/users/me/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(data);
        } catch {
          await secureDel('access', 'refresh');
        }
      }
      setLoading(false);
    })();
  }, []);

  // Session timeout via AppState
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current === 'active' && nextState.match(/inactive|background/)) {
        backgroundTime.current = Date.now();
      }
      if (nextState === 'active' && backgroundTime.current && user) {
        const elapsed = Date.now() - backgroundTime.current;
        if (elapsed >= INACTIVITY_TIMEOUT) {
          setLocked(true);
        }
        backgroundTime.current = null;
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [user]);

  async function login(username, password) {
    const { data } = await axios.post(`${API_BASE_URL}/api/token/`, { username, password });
    await secureSet('access',  data.access);
    await secureSet('refresh', data.refresh);
    // Fix #8 — persist username so biometric login can pre-fill the field
    await secureSet('cached_username', username);
    const { data: me } = await axios.get(`${API_BASE_URL}/api/users/me/`, {
      headers: { Authorization: `Bearer ${data.access}` },
    });
    setUser(me);
    setLocked(false);
  }

  async function logout() {
    await secureDel('access', 'refresh');
    setUser(null);
    setLocked(false);
  }

  function unlock() {
    setLocked(false);
    backgroundTime.current = null;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, locked, unlock }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
