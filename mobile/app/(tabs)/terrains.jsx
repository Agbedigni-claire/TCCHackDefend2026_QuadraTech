import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import Colors from '../../src/constants/colors';
import { useOffline, getCached, setCached, OfflineBanner } from '../../src/hooks/useOffline';

const STATUT_LABELS = {
  libre:          'Libre',
  en_transaction: 'En transaction',
  litige:         'En litige',
};

function StatutBadge({ statut }) {
  return (
    <View style={[s.badge, { backgroundColor: Colors.statutBg[statut] ?? '#f1f5f9' }]}>
      <View style={[s.badgeDot, { backgroundColor: Colors.statut[statut] ?? Colors.muted }]} />
      <Text style={[s.badgeText, { color: Colors.statut[statut] ?? Colors.muted }]}>
        {STATUT_LABELS[statut] ?? statut}
      </Text>
    </View>
  );
}

function TerrainCard({ terrain }) {
  const prop = terrain.proprietaire_actuel_detail;
  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.75}
      onPress={() => router.push(`/terrain/${terrain.id}`)}
    >
      <View style={s.cardHeader}>
        <Text style={s.cardAddress} numberOfLines={1}>{terrain.adresse}</Text>
        <StatutBadge statut={terrain.statut} />
      </View>
      <View style={s.cardMeta}>
        <View style={s.metaItem}>
          <Ionicons name="resize-outline" size={14} color={Colors.muted} />
          <Text style={s.metaText}>
            {parseFloat(terrain.superficie).toLocaleString('fr-FR')} m²
          </Text>
        </View>
        {prop && (
          <View style={s.metaItem}>
            <Ionicons name="person-outline" size={14} color={Colors.muted} />
            <Text style={s.metaText}>{prop.prenom} {prop.nom}</Text>
          </View>
        )}
        {terrain.coordonnees_gps ? (
          <View style={s.metaItem}>
            <Ionicons name="location-outline" size={14} color={Colors.muted} />
            <Text style={s.metaText} numberOfLines={1}>{terrain.coordonnees_gps}</Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.muted} style={s.chevron} />
    </TouchableOpacity>
  );
}

export default function Terrains() {
  const { isOnline, isOffline } = useOffline();

  const [all,        setAll]        = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(false);
  const [fromCache,  setFromCache]  = useState(false);
  const [search,     setSearch]     = useState('');

  async function load() {
    setError(false);
    if (isOffline) {
      const cached = await getCached('terrains');
      if (cached) { setAll(cached); setFromCache(true); }
      else        setError(true);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/api/terrains/');
      const list = data.results ?? data;
      setAll(list);
      setFromCache(false);
      await setCached('terrains', list);
    } catch {
      // Try cache on error
      const cached = await getCached('terrains');
      if (cached) { setAll(cached); setFromCache(true); }
      else        setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [isOnline]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filtered = search.trim()
    ? all.filter(t =>
        t.adresse.toLowerCase().includes(search.toLowerCase()) ||
        (STATUT_LABELS[t.statut] ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : all;

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <OfflineBanner />

      {/* En-tête */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Terrains</Text>
          {fromCache && (
            <Text style={s.cacheNote}>
              <Ionicons name="cloud-offline-outline" size={11} color={Colors.muted} /> Données locales
            </Text>
          )}
        </View>
        <Text style={s.count}>{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Barre de recherche */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher par adresse ou statut…"
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <View style={s.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.muted} />
          <Text style={s.errorText}>Impossible de charger les terrains</Text>
          <TouchableOpacity style={s.retryBtn} onPress={load}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={t => String(t.id)}
          renderItem={({ item }) => <TerrainCard terrain={item} />}
          contentContainerStyle={[s.list, { paddingBottom: 90 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="layers-outline" size={48} color={Colors.muted} />
              <Text style={s.emptyText}>Aucun terrain trouvé</Text>
            </View>
          }
        />
      )}

      {/* FAB — disabled hors ligne */}
      {!isOffline && (
        <TouchableOpacity
          style={s.fab}
          onPress={() => router.push('/terrain/nouveau')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bg },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title:       { fontSize: 22, fontWeight: '800', color: Colors.text },
  count:       { fontSize: 13, color: Colors.muted, fontWeight: '500' },
  cacheNote:   { fontSize: 11, color: Colors.muted, marginTop: 2 },

  searchBar:   {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: Colors.surface, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, padding: 0 },

  list:        { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },

  card:        {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  cardAddress: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  chevron:     { position: 'absolute', right: 0, top: '40%' },

  badge:       { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeDot:    { width: 7, height: 7, borderRadius: 4 },
  badgeText:   { fontSize: 11, fontWeight: '600' },

  cardMeta:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:    { fontSize: 12, color: Colors.muted, maxWidth: 140 },

  empty:       { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText:   { fontSize: 15, color: Colors.muted },

  errorText:   { fontSize: 15, color: Colors.muted, textAlign: 'center' },
  retryBtn:    { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  retryText:   { color: '#fff', fontWeight: '700' },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOpacity: 0.4,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
