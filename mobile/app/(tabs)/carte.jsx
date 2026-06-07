import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import Colors from '../../src/constants/colors';

const LOME = { latitude: 6.1375, longitude: 1.2123, latitudeDelta: 0.08, longitudeDelta: 0.08 };

const STATUT_LABELS = {
  libre:          'Libre',
  en_transaction: 'En transaction',
  litige:         'En litige',
};

function parseGPS(str) {
  if (!str) return null;
  const parts = str.split(',').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { latitude: parts[0], longitude: parts[1] };
  }
  return null;
}

function MarkerDot({ statut }) {
  const color = Colors.statut[statut] ?? Colors.muted;
  return (
    <View style={[dot.outer, { borderColor: color }]}>
      <View style={[dot.inner, { backgroundColor: color }]} />
    </View>
  );
}

const dot = StyleSheet.create({
  outer: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  inner: { width: 10, height: 10, borderRadius: 5 },
});

export default function Carte() {
  const mapRef   = useRef(null);
  const [terrains,  setTerrains]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [locBusy,   setLocBusy]   = useState(false);

  useEffect(() => {
    api.get('/api/terrains/')
      .then(({ data }) => setTerrains(data.results ?? data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const withGPS = terrains.filter(t => parseGPS(t.coordonnees_gps));

  async function centerOnUser() {
    setLocBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Activez la localisation dans les paramètres.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion({
        latitude:      loc.coords.latitude,
        longitude:     loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 800);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position.');
    } finally {
      setLocBusy(false);
    }
  }

  return (
    <View style={s.container}>
      {loading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={LOME}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {withGPS.map(terrain => {
          const coord = parseGPS(terrain.coordonnees_gps);
          return (
            <Marker key={terrain.id} coordinate={coord} tracksViewChanges={false}>
              <MarkerDot statut={terrain.statut} />
              <Callout onPress={() => router.push(`/terrain/${terrain.id}`)} tooltip={false}>
                <View style={s.callout}>
                  <Text style={s.calloutAddress} numberOfLines={2}>{terrain.adresse}</Text>
                  <View style={[s.calloutBadge, { backgroundColor: Colors.statutBg[terrain.statut] ?? '#f1f5f9' }]}>
                    <Text style={[s.calloutStatus, { color: Colors.statut[terrain.statut] ?? Colors.muted }]}>
                      {STATUT_LABELS[terrain.statut]}
                    </Text>
                  </View>
                  <Text style={s.calloutSuperficie}>
                    {parseFloat(terrain.superficie).toLocaleString('fr-FR')} m²
                  </Text>
                  <View style={s.calloutBtn}>
                    <Text style={s.calloutBtnText}>Voir le détail →</Text>
                  </View>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Légende */}
      <View style={s.legend}>
        {Object.entries(STATUT_LABELS).map(([key, label]) => (
          <View key={key} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: Colors.statut[key] }]} />
            <Text style={s.legendText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Compteur */}
      <View style={s.counter}>
        <Ionicons name="location" size={14} color={Colors.primary} />
        <Text style={s.counterText}>{withGPS.length} terrain{withGPS.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Bouton centrer */}
      <TouchableOpacity style={s.locBtn} onPress={centerOnUser} disabled={locBusy} activeOpacity={0.8}>
        {locBusy
          ? <ActivityIndicator size="small" color={Colors.primary} />
          : <Ionicons name="navigate" size={22} color={Colors.primary} />
        }
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1 },
  map:            { flex: 1 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 10,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(241,245,249,0.8)',
  },

  callout:        { width: 200, padding: 10, gap: 6 },
  calloutAddress: { fontSize: 13, fontWeight: '700', color: Colors.text, lineHeight: 18 },
  calloutBadge:   { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  calloutStatus:  { fontSize: 11, fontWeight: '600' },
  calloutSuperficie: { fontSize: 12, color: Colors.muted },
  calloutBtn:     { backgroundColor: Colors.primary, borderRadius: 6, paddingVertical: 6, alignItems: 'center', marginTop: 4 },
  calloutBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  legend:         {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10,
    padding: 10, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:      { width: 10, height: 10, borderRadius: 5 },
  legendText:     { fontSize: 11, color: Colors.text, fontWeight: '500' },

  counter:        {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  counterText:    { fontSize: 12, fontWeight: '600', color: Colors.text },

  locBtn:         {
    position: 'absolute', bottom: 28, right: 16,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
});
