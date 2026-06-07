import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { useBiometric } from '../../src/hooks/useBiometric';
import Colors from '../../src/constants/colors';

const ROLE_LABELS = { admin: 'Administrateur', agent: 'Agent', proprietaire: 'Propriétaire' };
const ROLE_COLORS = { admin: Colors.primaryDark, agent: Colors.primary, proprietaire: Colors.primary };

function InfoRow({ icon, label, value }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function SettingRow({ icon, label, sublabel, right }) {
  return (
    <View style={s.settingRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.settingLabel}>{label}</Text>
        {sublabel ? <Text style={s.settingSub}>{sublabel}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export default function Profil() {
  const { user, logout }                         = useAuth();
  const { isAvailable, isEnabled, setEnabled, biometryLabel } = useBiometric();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch {
              setBusy(false);  // Fix #7 — reset if logout throws unexpectedly
            }
          },
        },
      ]
    );
  }

  const roleColor = ROLE_COLORS[user?.role] ?? Colors.muted;
  const roleLabel = ROLE_LABELS[user?.role]  ?? user?.role;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content}>

        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={[s.avatar, { backgroundColor: roleColor + '22' }]}>
            <Text style={[s.avatarLetter, { color: roleColor }]}>
              {user?.username?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={s.name}>{user?.username}</Text>
          <View style={[s.roleBadge, { backgroundColor: roleColor + '18' }]}>
            <Text style={[s.roleText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
        </View>

        {/* Infos */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Informations du compte</Text>
          <InfoRow icon="person-outline"    label="Nom d'utilisateur" value={user?.username} />
          <InfoRow icon="mail-outline"      label="Email"             value={user?.email} />
          <InfoRow icon="shield-outline"    label="Rôle"              value={roleLabel} />
          <InfoRow icon="calendar-outline"  label="Inscrit le"
            value={user?.date_joined
              ? new Date(user.date_joined).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
              : null}
          />
          <InfoRow icon="time-outline" label="Dernière connexion"
            value={user?.last_login
              ? new Date(user.last_login).toLocaleString('fr-FR')
              : null}
          />
        </View>

        {/* Sécurité */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Sécurité</Text>

          {isAvailable ? (
            <SettingRow
              icon="finger-print"
              label={biometryLabel}
              sublabel={`Déverrouiller l'app avec ${biometryLabel.toLowerCase()}`}
              right={
                <Switch
                  value={isEnabled}
                  onValueChange={setEnabled}
                  trackColor={{ true: Colors.primary, false: Colors.border }}
                  thumbColor={isEnabled ? '#fff' : '#f0f0f0'}
                />
              }
            />
          ) : (
            <SettingRow
              icon="finger-print"
              label="Biométrie"
              sublabel="Non disponible sur cet appareil"
              right={<Text style={s.unavailable}>Indisponible</Text>}
            />
          )}

          <SettingRow
            icon="lock-closed"
            label="Verrouillage automatique"
            sublabel="Après 10 min d'inactivité"
            right={<Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
          />

          <SettingRow
            icon="key"
            label="Tokens JWT"
            sublabel="Stockage chiffré (SecureStore)"
            right={<Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
          />
        </View>

        {/* Raccourcis */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Navigation rapide</Text>
          <TouchableOpacity style={s.navRow} onPress={() => router.push('/terrain/nouveau')} activeOpacity={0.7}>
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={s.navText}>Nouveau terrain</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.navRow} onPress={() => router.push('/transaction/nouvelle')} activeOpacity={0.7}>
            <Ionicons name="swap-horizontal-outline" size={20} color={Colors.primary} />
            <Text style={s.navText}>Nouvelle transaction</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={s.navRow} onPress={() => router.push('/litige/nouveau')} activeOpacity={0.7}>
            <Ionicons name="alert-circle-outline" size={20} color={Colors.primaryDark} />
            <Text style={[s.navText, { color: Colors.primaryDark }]}>Déclarer un litige</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Déconnexion */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Compte</Text>
          <TouchableOpacity
            style={s.logoutRow}
            onPress={handleLogout}
            disabled={busy}
            activeOpacity={0.7}
          >
            {busy
              ? <ActivityIndicator color={Colors.primaryDark} size="small" />
              : <Ionicons name="log-out-outline" size={20} color={Colors.primaryDark} />
            }
            <Text style={s.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.version}>TrustLand v1.0.0 — République du Togo</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: Colors.bg },
  content:       { padding: 20, paddingBottom: 40 },

  avatarSection: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  avatar:        { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarLetter:  { fontSize: 40, fontWeight: '800' },
  name:          { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  roleBadge:     { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  roleText:      { fontSize: 13, fontWeight: '600' },

  card:          { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTitle:     { fontSize: 12, fontWeight: '700', color: Colors.muted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  infoRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  infoIcon:      { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.primary + '12', justifyContent: 'center', alignItems: 'center' },
  infoContent:   { flex: 1 },
  infoLabel:     { fontSize: 11, color: Colors.muted, marginBottom: 2 },
  infoValue:     { fontSize: 14, color: Colors.text, fontWeight: '600' },

  settingRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  settingLabel:  { fontSize: 14, color: Colors.text, fontWeight: '600' },
  settingSub:    { fontSize: 11, color: Colors.muted, marginTop: 2 },
  unavailable:   { fontSize: 12, color: Colors.muted },

  navRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  navText:       { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '600' },

  logoutRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  logoutText:    { fontSize: 15, color: Colors.primaryDark, fontWeight: '600' },

  version:       { textAlign: 'center', color: Colors.muted, fontSize: 12, marginTop: 8 },
});
