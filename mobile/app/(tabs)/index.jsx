import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import { useAuth } from '../../src/context/AuthContext';
import Colors from '../../src/constants/colors';

const STATUT_LABELS = {
  libre:          'Libre',
  en_transaction: 'En transaction',
  litige:         'En litige',
};

function StatCard({ label, value, color, icon }) {
  return (
    <View style={[s.statCard, { borderLeftColor: color ?? Colors.primary }]}>
      <Ionicons name={icon} size={22} color={color ?? Colors.primary} style={s.statIcon} />
      <Text style={s.statValue}>{value ?? '—'}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function QuickLink({ icon, label, href, color }) {
  return (
    <TouchableOpacity style={s.quickLink} onPress={() => router.push(href)} activeOpacity={0.7}>
      <View style={[s.quickIcon, { backgroundColor: (color ?? Colors.primary) + '18' }]}>
        <Ionicons name={icon} size={24} color={color ?? Colors.primary} />
      </View>
      <Text style={s.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [stats,      setStats]      = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  async function loadStats() {
    try {
      const { data } = await api.get('/api/stats/');
      setStats(data);
    } catch { /* silencieux */ }
  }

  useEffect(() => { loadStats(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }

  const roleLabel = {
    admin:        'Administrateur',
    agent:        'Agent',
    proprietaire: 'Propriétaire',
  }[user?.role] ?? user?.role;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* En-tête */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>Bonjour,</Text>
            <Text style={s.username}>{user?.username} 👋</Text>
            <View style={s.roleBadge}>
              <Text style={s.roleText}>{roleLabel}</Text>
            </View>
          </View>
          <View style={s.logoSmall}>
            <Text style={s.logoLetter}>T</Text>
          </View>
        </View>

        {/* Stats */}
        {stats ? (
          <>
            <Text style={s.sectionTitle}>Vue d'ensemble</Text>
            <View style={s.statsGrid}>
              <StatCard
                label="Terrains total"
                value={stats.terrains_total}
                icon="layers"
                color={Colors.primary}
              />
              <StatCard
                label="Terrains libres"
                value={stats.terrains_par_statut?.libre}
                icon="checkmark-circle"
                color={Colors.primary}
              />
              <StatCard
                label="En transaction"
                value={stats.terrains_par_statut?.en_transaction}
                icon="swap-horizontal"
                color={Colors.primary}
              />
              <StatCard
                label="Litiges ouverts"
                value={stats.litiges_ouverts}
                icon="warning"
                color={Colors.primaryDark}
              />
              <StatCard
                label="Transactions"
                value={stats.transactions_total}
                icon="cash"
                color={Colors.primaryDark}
              />
              <StatCard
                label="Alertes IA"
                value={stats.alertes_actives}
                icon="alert-circle"
                color={Colors.primary}
              />
            </View>
          </>
        ) : (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
        )}

        {/* Accès rapide */}
        <Text style={s.sectionTitle}>Accès rapide</Text>
        <View style={s.quickGrid}>
          <QuickLink icon="layers-outline"        label="Terrains"    href="/(tabs)/terrains" color={Colors.primary} />
          <QuickLink icon="earth-outline"         label="Carte"       href="/(tabs)/carte"    color={Colors.primary} />
          <QuickLink icon="qr-code-outline"       label="Scanner QR"  href="/(tabs)/scanner"  color={Colors.primary} />
          <QuickLink icon="document-text-outline" label="Documents"   href="/(tabs)/verifier" color={Colors.primaryDark} />
          <QuickLink icon="person-outline"        label="Mon profil"  href="/(tabs)/profil"   color={Colors.muted} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: Colors.bg },
  scroll:       { flex: 1 },
  content:      { padding: 20, paddingBottom: 40 },

  header:       {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 28,
  },
  greeting:     { fontSize: 15, color: Colors.muted },
  username:     { fontSize: 22, fontWeight: '800', color: Colors.text, marginVertical: 2 },
  roleBadge:    {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '18', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3, marginTop: 4,
  },
  roleText:     { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  logoSmall:    {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  logoLetter:   { color: '#fff', fontSize: 24, fontWeight: '800' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },

  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  statCard:     {
    width: '47%', backgroundColor: Colors.surface, borderRadius: 12,
    padding: 14, borderLeftWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statIcon:     { marginBottom: 6 },
  statValue:    { fontSize: 24, fontWeight: '800', color: Colors.text },
  statLabel:    { fontSize: 12, color: Colors.muted, marginTop: 2 },

  quickGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickLink:    {
    width: '30%', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 16, flex: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  quickIcon:    { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickLabel:   { fontSize: 12, fontWeight: '600', color: Colors.text, textAlign: 'center' },
});
