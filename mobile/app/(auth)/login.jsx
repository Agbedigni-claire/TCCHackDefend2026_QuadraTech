import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../src/context/AuthContext';
import { useBiometric } from '../../src/hooks/useBiometric';
import Colors from '../../src/constants/colors';

export default function Login() {
  const { user, login }                           = useAuth();
  const { isAvailable, isEnabled, authenticate, biometryLabel } = useBiometric();

  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [error,       setError]       = useState(null);
  const [bioSuccess,  setBioSuccess]  = useState(false);
  const [busy,        setBusy]        = useState(false);

  // Auto-trigger biometric on mount if enabled
  useEffect(() => {
    if (isAvailable && isEnabled && !user) {
      tryBiometric();
    }
  }, [isAvailable, isEnabled]);

  if (user) return <Redirect href="/(tabs)" />;

  // Fix #8 — on biometric success, pre-fill username from SecureStore so user only needs password
  async function tryBiometric() {
    const ok = await authenticate('Vérifiez votre identité pour TrustLand');
    if (ok) {
      const saved = await SecureStore.getItemAsync('cached_username');
      if (saved) setUsername(saved);
      setBioSuccess(true);
      setError(null);
    }
  }

  async function handleLogin() {
    if (!username.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setError(null);
    setBioSuccess(false);
    setBusy(true);
    try {
      await login(username.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      const d = err.response?.data;
      if (d?.detail) setError(d.detail);
      else if (d)    setError(Object.values(d).flat().join(' '));
      else           setError('Identifiants incorrects. Vérifiez votre nom d\'utilisateur et mot de passe.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo / titre */}
        <View style={s.logoBox}>
          <View style={s.shield}>
            <Text style={s.shieldInner}>T</Text>
          </View>
          <Text style={s.brand}>TrustLand</Text>
          <Text style={s.tagline}>Registre Foncier Numérique</Text>
        </View>

        {/* Carte */}
        <View style={s.card}>
          <Text style={s.title}>Connexion</Text>

          {bioSuccess && (
            <View style={s.successBox}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
              <Text style={s.successText}>Identité confirmée — entrez votre mot de passe</Text>
            </View>
          )}

          {error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <Text style={s.label}>Nom d'utilisateur</Text>
          <TextInput
            style={s.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Votre identifiant"
            placeholderTextColor={Colors.muted}
            returnKeyType="next"
          />

          <Text style={s.label}>Mot de passe</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Votre mot de passe"
            placeholderTextColor={Colors.muted}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[s.btn, busy && s.btnDisabled]}
            onPress={handleLogin}
            disabled={busy}
            activeOpacity={0.8}
          >
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Se connecter</Text>
            }
          </TouchableOpacity>

          {/* Biometric button */}
          {isAvailable && (
            <TouchableOpacity style={s.biometricBtn} onPress={tryBiometric} activeOpacity={0.7}>
              <Ionicons name="finger-print" size={22} color={Colors.primary} />
              <Text style={s.biometricText}>Utiliser {biometryLabel}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={s.footer}>TrustLand © 2026 — République du Togo</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrapper:      { flex: 1, backgroundColor: Colors.bg },
  scroll:       { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoBox:      { alignItems: 'center', marginBottom: 32 },
  shield:       {
    width: 72, height: 72, borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    shadowColor: Colors.primary, shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  shieldInner:  { color: '#fff', fontSize: 36, fontWeight: '800' },
  brand:        { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: 0.5 },
  tagline:      { fontSize: 13, color: Colors.muted, marginTop: 4 },

  card:         {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 24, marginBottom: 24,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
    borderTopWidth: 3, borderTopColor: Colors.primary,
  },
  title:        { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 20 },

  successBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary + '18', borderRadius: 8, padding: 12, marginBottom: 16 },
  successText:  { color: Colors.primary, fontSize: 13, fontWeight: '600', flex: 1 },
  errorBox:     { backgroundColor: '#dbeafe', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText:    { color: '#1e40af', fontSize: 13, lineHeight: 18 },

  label:        { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input:        {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: Colors.text, backgroundColor: Colors.bg, marginBottom: 16,
  },

  btn:          { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDisabled:  { opacity: 0.7 },
  btnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },

  biometricBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 10 },
  biometricText:{ fontSize: 14, color: Colors.primary, fontWeight: '600' },

  footer:       { textAlign: 'center', color: Colors.muted, fontSize: 12 },
});
