import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../src/constants/colors';

export default function Scanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]           = useState(false);
  const [active,  setActive]            = useState(false);

  // Réactive le scanner à chaque focus de l'onglet
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setActive(true);
      return () => setActive(false);
    }, [])
  );

  if (!permission) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Ionicons name="camera-off-outline" size={64} color={Colors.muted} />
          <Text style={s.permTitle}>Accès caméra requis</Text>
          <Text style={s.permDesc}>
            TrustLand a besoin de la caméra pour scanner les QR codes des terrains.
          </Text>
          <TouchableOpacity style={s.btn} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={s.btnText}>Autoriser la caméra</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  function handleBarCodeScanned({ data }) {
    if (scanned) return;
    setScanned(true);

    // Le QR code contient "/api/terrains/<id>/" ou "trustland://terrain/<id>"
    const match = data.match(/\/terrains\/(\d+)\/?/);
    if (match) {
      const id = match[1];
      router.push(`/terrain/${id}`);
    } else {
      Alert.alert(
        'QR non reconnu',
        `Ce QR code n'est pas un terrain TrustLand.\n\n${data}`,
        [{ text: 'Scanner à nouveau', onPress: () => setScanned(false) }]
      );
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* En-tête */}
      <View style={s.header}>
        <Text style={s.title}>Scanner QR</Text>
        <Text style={s.subtitle}>Pointez la caméra vers le QR code du terrain</Text>
      </View>

      {/* Caméra */}
      <View style={s.cameraContainer}>
        {active && (
          <CameraView
            style={s.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />
        )}

        {/* Cadre de visée */}
        <View style={s.overlay} pointerEvents="none">
          <View style={s.finder}>
            {/* Coins */}
            <View style={[s.corner, s.tl]} />
            <View style={[s.corner, s.tr]} />
            <View style={[s.corner, s.bl]} />
            <View style={[s.corner, s.br]} />
          </View>
        </View>
      </View>

      {/* Bouton réinitialiser */}
      {scanned && (
        <View style={s.footer}>
          <TouchableOpacity style={s.btn} onPress={() => setScanned(false)} activeOpacity={0.8}>
            <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={s.btnText}>Scanner à nouveau</Text>
          </TouchableOpacity>
        </View>
      )}

      {!scanned && (
        <View style={s.footer}>
          <Text style={s.hint}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.muted} />{' '}
            Recherche automatique en cours…
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const FINDER = 220;
const CORNER = 24;
const BORDER = 3;

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: Colors.bg },

  header: {
    padding: 20,
    paddingBottom: 12,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  title:    { fontSize: 20, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center' },

  cameraContainer: { flex: 1, position: 'relative' },
  camera:          { flex: 1 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems:     'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  finder: {
    width:  FINDER,
    height: FINDER,
    position: 'relative',
    backgroundColor: 'transparent',
  },

  corner: {
    position: 'absolute',
    width:    CORNER,
    height:   CORNER,
    borderColor: Colors.primary,
  },
  tl: { top: 0,  left:  0,  borderTopWidth: BORDER, borderLeftWidth:  BORDER },
  tr: { top: 0,  right: 0,  borderTopWidth: BORDER, borderRightWidth: BORDER },
  bl: { bottom: 0, left:  0, borderBottomWidth: BORDER, borderLeftWidth:  BORDER },
  br: { bottom: 0, right: 0, borderBottomWidth: BORDER, borderRightWidth: BORDER },

  footer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  btn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 12,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  hint: { color: '#94a3b8', fontSize: 13 },

  permTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 20, marginBottom: 8 },
  permDesc:  { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
});
