import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/colors';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const wasOffline       = useRef(false);
  const reconnectTimer   = useRef(null);
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    NetInfo.fetch().then(state => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      wasOffline.current = !online;
      setIsOnline(online);
    });

    const unsub = NetInfo.addEventListener(state => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      if (online && wasOffline.current) {
        setJustReconnected(true);
        // Fix #3 — clear previous timer to avoid state update on unmounted component
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(() => setJustReconnected(false), 3000);
      }
      wasOffline.current = !online;
      setIsOnline(online);
    });

    return () => {
      unsub();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  return { isOnline, isOffline: !isOnline, justReconnected };
}

// Cache helpers
export async function getCached(key) {
  try {
    const raw = await AsyncStorage.getItem(`cache_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function setCached(key, value) {
  try { await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(value)); } catch {}
}

// Persistent banner component — mount once at root level
export function OfflineBanner() {
  const { isOnline, justReconnected } = useOffline();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isOnline || justReconnected) {
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    }
  }, [isOnline, justReconnected]);

  if (isOnline && !justReconnected) return null;

  return (
    <Animated.View
      style={[
        s.banner,
        { backgroundColor: justReconnected ? Colors.primary : Colors.primaryDark },
        { opacity },
      ]}
    >
      <Text style={s.bannerText}>
        {justReconnected ? '✓ Connexion rétablie' : '📵 Mode hors ligne — données locales'}
      </Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  banner: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bannerText: { color: '#fff', fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
});
