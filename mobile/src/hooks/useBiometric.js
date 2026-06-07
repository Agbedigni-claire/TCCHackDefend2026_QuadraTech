import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'biometric_enabled';

export function useBiometric() {
  const [isAvailable,    setIsAvailable]    = useState(false);
  const [isEnabled,      setIsEnabledState] = useState(false);
  const [supportedTypes, setSupportedTypes] = useState([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    (async () => {
      const [hw, enrolled, types, storedEnabled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
        AsyncStorage.getItem(KEY),
      ]);
      const available = hw && enrolled;
      setIsAvailable(available);
      setSupportedTypes(types);
      setIsEnabledState(available && storedEnabled === 'true');
      setLoading(false);
    })();
  }, []);

  async function authenticate(reason = 'Déverrouillez TrustLand') {
    if (!isAvailable) return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel:   'Annuler',
        fallbackLabel: 'Mot de passe',
        disableDeviceFallback: false,
      });
      return result.success;
    } catch { return false; }
  }

  async function setEnabled(value) {
    await AsyncStorage.setItem(KEY, value ? 'true' : 'false');
    setIsEnabledState(value);
  }

  const hasFaceId = supportedTypes.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
  );
  const biometryLabel = hasFaceId ? 'Face ID' : 'Empreinte digitale';

  return { isAvailable, isEnabled, loading, authenticate, setEnabled, biometryLabel };
}
