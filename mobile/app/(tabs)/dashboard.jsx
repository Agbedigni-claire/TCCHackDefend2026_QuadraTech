import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect, Text as SvgText, G, Line } from 'react-native-svg';
import api from '../../src/api/axios';
import Colors from '../../src/constants/colors';
import { OfflineBanner } from '../../src/hooks/useOffline';

// ── Bar chart (react-native-svg) ──────────────────────────────────────────────

const CHART_H   = 140;
const BAR_W     = 70;
const BAR_GAP   = 20;
const LABEL_H   = 36;

function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const svgW = data.length * (BAR_W + BAR_GAP) - BAR_GAP;
  const svgH = CHART_H + LABEL_H;

  return (
    <Svg width={svgW} height={svgH}>
      {/* Baseline */}
      <Line x1={0} y1={CHART_H} x2={svgW} y2={CHART_H} stroke={Colors.border} strokeWidth={1} />

      {data.map((d, i) => {
        const barH = max > 0 ? Math.max((d.value / max) * CHART_H, 4) : 4;
        const x    = i * (BAR_W + BAR_GAP);
        const y    = CHART_H - barH;
        return (
          <G key={d.key}>
            <Rect x={x} y={y} width={BAR_W} height={barH} fill={d.color} rx={6} />
            {/* Value label above bar */}
            <SvgText
              x={x + BAR_W / 2} y={Math.max(y - 6, 12)}
              textAnchor="middle" fontSize={13} fontWeight="bold" fill={Colors.text}
            >
              {d.value}
            </SvgText>
            {/* Name label below chart */}
            <SvgText
              x={x + BAR_W / 2} y={CHART_H + 20}
              textAnchor="middle" fontSize={11} fill={Colors.muted}
            >
              {d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, wide }) {
  return (
    <View style={[s.statCard, wide && s.statWide, { borderLeftColor: color ?? Colors.primary }]}>
      <Ionicons name={icon} size={20} color={color ?? Colors.primary} style={{ marginBottom: 6 }} />
      <Text style={s.statValue}>{value ?? '—'}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ── Alert row ─────────────────────────────────────────────────────────────────

const NIVEAU_ICON  = { faible: '🟡', moyen: '🟠', critique: '🔴' };
const NIVEAU_COLOR = { faible: '#93c5fd', moyen: Colors.primary, critique: Colors.primaryDark };

function AlertRow({ alerte }) {
  const color = NIVEAU_COLOR[alerte.niveau] ?? Colors.muted;
  return (
    <TouchableOpacity
      style={s.row}
      onPress={() => router.push(`/terrain/${alerte.terrain}`)}
      activeOpacity={0.7}
    >
      <Text style={s.rowIcon}>{NIVEAU_ICON[alerte.niveau] ?? '⚠️'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{alerte.description}</Text>
        <Text style={s.rowSub}>
          {new Date(alerte.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <View style={[s.niveauBadge, { backgroundColor: color + '18' }]}>
        <Text style={[s.niveauText, { color }]}>{alerte.niveau}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Transaction row ───────────────────────────────────────────────────────────

function TxRow({ tx }) {
  return (
    <View style={s.row}>
      <View style={[s.txIcon, { backgroundColor: Colors.primary + '15' }]}>
        <Ionicons name="swap-horizontal" size={18} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle} numberOfLines={1}>
          Transaction #{tx.id}
        </Text>
        <Text style={s.rowSub}>
          {parseFloat(tx.montant).toLocaleString('fr-FR')} FCFA ·{' '}
          {new Date(tx.date_transaction).toLocaleDateString('fr-FR')}
        </Text>
      </View>
    </View>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, icon }) {
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats,        setStats]        = useState(null);
  const [alertes,      setAlertes]      = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [loadError,    setLoadError]    = useState(false);
  const [lastUpdate,   setLastUpdate]   = useState(null);

  async function loadAll() {
    setLoadError(false);
    try {
      const [sRes, aRes, tRes] = await Promise.allSettled([
        api.get('/api/stats/'),
        api.get('/api/alertes/?ordering=-date&page_size=5'),
        api.get('/api/transactions/?ordering=-date_transaction&page_size=5'),
      ]);

      // Fix #4 — track if ALL calls failed to show error state
      const allFailed = [sRes, aRes, tRes].every(r => r.status === 'rejected');
      if (allFailed) { setLoadError(true); return; }

      if (sRes.status === 'fulfilled') setStats(sRes.value.data);
      if (aRes.status === 'fulfilled') {
        const d = aRes.value.data;
        setAlertes((d.results ?? d).slice(0, 5));
      }
      if (tRes.status === 'fulfilled') {
        const d = tRes.value.data;
        setTransactions((d.results ?? d).slice(0, 5));
      }
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  const barData = stats ? [
    { key: 'libre',          label: 'Libres',      value: stats.terrains_par_statut?.libre          ?? 0, color: Colors.primary  },
    { key: 'en_transaction', label: 'Transaction', value: stats.terrains_par_statut?.en_transaction ?? 0, color: Colors.primary },
    { key: 'litige',         label: 'Litige',      value: stats.terrains_par_statut?.litige         ?? 0, color: Colors.primaryDark    },
  ] : [];

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg }} edges={['top']}>
        <OfflineBanner />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 }}>
          <Ionicons name="cloud-offline-outline" size={56} color={Colors.muted} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.text }}>Tableau de bord indisponible</Text>
          <Text style={{ fontSize: 13, color: Colors.muted, textAlign: 'center' }}>
            Impossible de charger les données. Vérifiez votre connexion.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 }}
            onPress={() => { setLoading(true); loadAll(); }}
            activeOpacity={0.8}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.pageTitle}>Tableau de bord</Text>
            {lastUpdate && (
              <Text style={s.updateTime}>
                Mis à jour à {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onRefresh} style={s.refreshBtn}>
            <Ionicons name="refresh" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats grid */}
        {stats && (
          <>
            <View style={s.grid}>
              <StatCard
                label="Terrains total" value={stats.terrains_total}
                icon="layers" color={Colors.primary}
              />
              <StatCard
                label="Terrains libres" value={stats.terrains_par_statut?.libre}
                icon="checkmark-circle" color={Colors.primary}
              />
              <StatCard
                label="En transaction" value={stats.terrains_par_statut?.en_transaction}
                icon="swap-horizontal" color={Colors.primary}
              />
              <StatCard
                label="En litige" value={stats.terrains_par_statut?.litige}
                icon="warning" color={Colors.primaryDark}
              />
              <StatCard
                label="Transactions" value={stats.transactions_total}
                icon="cash" color={Colors.primaryDark}
              />
              <StatCard
                label="Alertes IA" value={stats.alertes_actives}
                icon="alert-circle"
                color={(stats.alertes_actives ?? 0) > 0 ? Colors.primaryDark : Colors.primary}
              />
            </View>

            {/* Bar chart */}
            <View style={s.card}>
              <SectionHeader title="Répartition par statut" icon="bar-chart" />
              <View style={s.chartWrap}>
                <BarChart data={barData} />
              </View>
            </View>
          </>
        )}

        {/* Dernières alertes */}
        {alertes.length > 0 && (
          <View style={s.card}>
            <SectionHeader title="Dernières alertes IA" icon="alert-circle" />
            {alertes.map(a => <AlertRow key={a.id} alerte={a} />)}
          </View>
        )}

        {/* Dernières transactions */}
        {transactions.length > 0 && (
          <View style={s.card}>
            <SectionHeader title="Dernières transactions" icon="cash" />
            {transactions.map(t => <TxRow key={t.id} tx={t} />)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16, paddingBottom: 48 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 16,
  },
  pageTitle:  { fontSize: 22, fontWeight: '800', color: Colors.text },
  updateTime: { fontSize: 11, color: Colors.muted, marginTop: 2 },
  refreshBtn: { padding: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: 12,
    padding: 14, borderLeftWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statWide:  { width: '100%' },
  statValue: { fontSize: 26, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.muted, marginTop: 2 },

  card: {
    backgroundColor: Colors.surface, borderRadius: 12,
    padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text },

  chartWrap: { alignItems: 'center', paddingTop: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowIcon:  { fontSize: 20 },
  txIcon:   { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontSize: 13, fontWeight: '600', color: Colors.text },
  rowSub:   { fontSize: 11, color: Colors.muted, marginTop: 2 },

  niveauBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  niveauText:  { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
});
