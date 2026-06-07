import { useEffect, useRef, useState } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as ScreenCapture from 'expo-screen-capture';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { useBiometric } from '../src/hooks/useBiometric';
import api from '../src/api/axios';
import Colors from '../src/constants/colors';

// Foreground notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

async function registerPushToken() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await api.post('/api/push-token/', { token });
  } catch { /* silencieux */ }
}

// ── Lock screen overlay ───────────────────────────────────────────────────────

function LockScreen() {
  const { unlock, logout }                                              = useAuth();
  const { isAvailable, isEnabled, loading: bioLoading, authenticate, biometryLabel } = useBiometric();
  const [loading, setLoading] = useState(false);
  const prompted  = useRef(false);

  // Fix #2 — wait for async biometric check before auto-prompting
  useEffect(() => {
    if (!bioLoading && isAvailable && isEnabled && !prompted.current) {
      prompted.current = true;
      tryBiometric();
    }
  }, [bioLoading, isAvailable, isEnabled]);

  async function tryBiometric() {
    setLoading(true);
    const ok = await authenticate('Déverrouillez TrustLand pour continuer');
    setLoading(false);
    if (ok) unlock();
  }

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <View style={ls.overlay}>
      <View style={ls.card}>
        <View style={ls.shield}>
          <Text style={ls.shieldLetter}>T</Text>
        </View>
        <Text style={ls.title}>Application verrouillée</Text>
        <Text style={ls.sub}>
          Vous avez été inactif pendant 10 minutes.{'\n'}
          Déverrouillez pour continuer.
        </Text>

        {isAvailable ? (
          <TouchableOpacity style={ls.biometricBtn} onPress={tryBiometric} disabled={loading} activeOpacity={0.8}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={ls.biometricText}>
                    Déverrouiller avec {biometryLabel}
                  </Text>
                </>
            }
          </TouchableOpacity>
        ) : (
          <Text style={ls.noHw}>Biométrie non disponible</Text>
        )}

        <TouchableOpacity style={ls.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={ls.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ls = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  card:    { backgroundColor: Colors.surface, borderRadius: 20, padding: 32, width: '85%', alignItems: 'center' },
  shield:  { width: 64, height: 64, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  shieldLetter: { color: '#fff', fontSize: 30, fontWeight: '800' },
  title:   { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  sub:     { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  biometricBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28, marginBottom: 12, minWidth: 200, alignItems: 'center' },
  biometricText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  noHw:    { color: Colors.muted, fontSize: 13, marginBottom: 12 },
  logoutBtn:    { paddingVertical: 10 },
  logoutText:   { color: Colors.primaryDark, fontWeight: '600', fontSize: 14 },
});

// ── Notification + push token setup ──────────────────────────────────────────

function AppSetup() {
  const { user } = useAuth();  // Fix #11 — `locked` was destructured but never used here
  const responseListener = useRef(null);

  useEffect(() => {
    if (!user) return;
    registerPushToken();

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.terrainId) router.push(`/terrain/${data.terrainId}`);
    });

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  // Screenshot protection on sensitive screens
  useEffect(() => {
    ScreenCapture.preventScreenCaptureAsync().catch(() => {});
    return () => { ScreenCapture.allowScreenCaptureAsync().catch(() => {}); };
  }, []);

  return null;
}

// ── Root layout ───────────────────────────────────────────────────────────────

function RootWithLock() {
  const { locked } = useAuth();

  return (
    <>
      <AppSetup />
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="terrain/[id]"
          options={{
            headerShown: true,
            title: 'Détail terrain',
            headerTintColor: '#2563eb',
            headerStyle: { backgroundColor: '#ffffff' },
            headerBackTitle: 'Retour',
          }}
        />
        <Stack.Screen name="terrain/nouveau" options={{ headerShown: false }} />
        <Stack.Screen name="transaction/nouvelle" options={{ headerShown: false }} />
        <Stack.Screen name="litige/nouveau" options={{ headerShown: false }} />
      </Stack>

      {/* Lock overlay — rendered above everything */}
      {locked && <LockScreen />}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootWithLock />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
