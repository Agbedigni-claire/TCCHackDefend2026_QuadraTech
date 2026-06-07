import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/api/axios';
import Colors from '../../src/constants/colors';

// ── Searchable select for proprietaire ───────────────────────────────────────

function SearchableSelect({ items, selected, onSelect, placeholder, label }) {
  const [query, setQuery]     = useState('');
  const [open,  setOpen]      = useState(false);

  const filtered = query.length >= 1
    ? items.filter(p =>
        `${p.prenom} ${p.nom} ${p.email}`.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  const selectedItem = items.find(p => p.id === selected);

  return (
    <View style={ss.wrapper}>
      <Text style={ss.label}>{label}</Text>
      <TouchableOpacity
        style={[ss.trigger, open && { borderColor: Colors.primary }]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.8}
      >
        <Text style={selectedItem ? ss.selected : ss.placeholder}>
          {selectedItem ? `${selectedItem.prenom} ${selectedItem.nom}` : placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.muted} />
      </TouchableOpacity>

      {open && (
        <View style={ss.dropdown}>
          <TextInput
            style={ss.searchInput}
            placeholder="Rechercher…"
            placeholderTextColor={Colors.muted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {filtered.slice(0, 8).map(p => (
            <TouchableOpacity
              key={p.id}
              style={[ss.option, selected === p.id && ss.optionSelected]}
              onPress={() => { onSelect(p.id); setOpen(false); setQuery(''); }}
            >
              <Text style={ss.optionText}>{p.prenom} {p.nom}</Text>
              <Text style={ss.optionSub}>{p.email}</Text>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <Text style={ss.empty}>Aucun résultat</Text>
          )}
        </View>
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  wrapper:       { marginBottom: 16 },
  label:         { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  trigger:       {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: Colors.bg,
  },
  selected:      { fontSize: 15, color: Colors.text },
  placeholder:   { fontSize: 15, color: Colors.muted },
  dropdown:      {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    backgroundColor: Colors.surface, marginTop: 4, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
    zIndex: 999,
  },
  searchInput:   {
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: Colors.text,
  },
  option:        { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border + '88' },
  optionSelected:{ backgroundColor: Colors.primary + '12' },
  optionText:    { fontSize: 14, fontWeight: '600', color: Colors.text },
  optionSub:     { fontSize: 12, color: Colors.muted, marginTop: 1 },
  empty:         { padding: 12, color: Colors.muted, textAlign: 'center', fontSize: 13 },
});

// ── Form field ────────────────────────────────────────────────────────────────

function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={f.label}>{label}</Text>
      <TextInput style={f.input} placeholderTextColor={Colors.muted} {...props} />
    </View>
  );
}

const f = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 15, color: Colors.text, backgroundColor: Colors.bg,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NouveauTerrain() {
  const [proprietaires, setProprietaires] = useState([]);
  const [form, setForm] = useState({
    adresse:         '',
    superficie:      '',
    coordonnees_gps: '',
    proprietaire:    null,
  });
  const [photo,        setPhoto]        = useState(null);
  const [locating,     setLocating]     = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [errors,       setErrors]       = useState({});
  const [globalError,  setGlobalError]  = useState(null);

  useEffect(() => {
    api.get('/api/proprietaires/').then(r => {
      setProprietaires(r.data.results ?? r.data);
    }).catch(() => {});
  }, []);

  async function fillGPS() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Autorisez la localisation dans les paramètres.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = `${loc.coords.latitude.toFixed(6)},${loc.coords.longitude.toFixed(6)}`;
      setForm(p => ({ ...p, coordonnees_gps: coords }));
    } catch {
      Alert.alert('Erreur', 'Impossible d\'obtenir la position GPS.');
    } finally {
      setLocating(false);
    }
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorisez l\'accès aux photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto(result.assets[0]);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorisez l\'accès à la caméra.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets?.[0]) {
      setPhoto(result.assets[0]);
    }
  }

  function showPhotoOptions() {
    Alert.alert('Photo du terrain', 'Choisissez une source', [
      { text: 'Caméra',      onPress: takePhoto },
      { text: 'Bibliothèque', onPress: pickPhoto },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  async function submit() {
    setGlobalError(null);
    const errs = {};
    if (!form.adresse.trim()) errs.adresse = 'Adresse requise';

    // Fix #5 — validate superficie is a positive number
    const sup = parseFloat(form.superficie.replace(',', '.'));
    if (!form.superficie.trim() || isNaN(sup) || sup <= 0) {
      errs.superficie = 'Superficie invalide (nombre positif requis)';
    }

    if (!form.proprietaire)          errs.proprietaire    = 'Propriétaire requis';
    if (!form.coordonnees_gps.trim()) errs.coordonnees_gps = 'Coordonnées GPS requises';

    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);

    try {
      // 1. Créer le terrain
      const { data: terrain } = await api.post('/api/terrains/', {
        adresse:             form.adresse.trim(),
        superficie:          sup,
        coordonnees_gps:     form.coordonnees_gps.trim(),
        proprietaire_actuel: form.proprietaire,
      });

      // 2. Upload photo si fournie
      if (photo) {
        const fd = new FormData();
        fd.append('terrain', terrain.id);
        fd.append('type_document', 'autre');
        fd.append('fichier', {
          uri:  photo.uri,
          name: `terrain_${terrain.id}.jpg`,
          type: 'image/jpeg',
        });
        await api.post('/api/documents/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).catch(() => {});
      }

      router.replace(`/terrain/${terrain.id}`);
    } catch (err) {
      const d = err.response?.data;
      // Fix #6 — surface `detail` / non-field errors to the user
      if (d?.detail) {
        setGlobalError(d.detail);
      } else if (d && typeof d === 'object') {
        setErrors(d);
        if (d.non_field_errors) setGlobalError(d.non_field_errors.join(' '));
      } else {
        setGlobalError('Impossible de créer le terrain. Vérifiez les données.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Nav header */}
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={s.navTitle}>Nouveau terrain</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {globalError && (
            <View style={s.globalErrBox}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.primaryDark} style={{ marginRight: 6 }} />
              <Text style={s.globalErrText}>{globalError}</Text>
            </View>
          )}

          <Field
            label="Adresse *"
            placeholder="Ex : Quartier Adidogomé, Lomé"
            value={form.adresse}
            onChangeText={v => setForm(p => ({ ...p, adresse: v }))}
            multiline
          />
          {errors.adresse && <Text style={s.errText}>{errors.adresse}</Text>}

          <Field
            label="Superficie (m²) *"
            placeholder="Ex : 500"
            value={form.superficie}
            onChangeText={v => setForm(p => ({ ...p, superficie: v }))}
            keyboardType="decimal-pad"
          />
          {errors.superficie && <Text style={s.errText}>{errors.superficie}</Text>}

          {/* GPS */}
          <Text style={f.label}>Coordonnées GPS *</Text>
          <View style={s.gpsRow}>
            <TextInput
              style={[f.input, { flex: 1 }]}
              placeholder="latitude,longitude"
              placeholderTextColor={Colors.muted}
              value={form.coordonnees_gps}
              onChangeText={v => setForm(p => ({ ...p, coordonnees_gps: v }))}
            />
            <TouchableOpacity style={s.gpsBtn} onPress={fillGPS} disabled={locating} activeOpacity={0.8}>
              {locating
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="locate" size={18} color="#fff" />
              }
            </TouchableOpacity>
          </View>
          {errors.coordonnees_gps && <Text style={s.errText}>{errors.coordonnees_gps}</Text>}

          {/* Proprietaire */}
          <SearchableSelect
            label="Propriétaire *"
            items={proprietaires}
            selected={form.proprietaire}
            onSelect={id => setForm(p => ({ ...p, proprietaire: id }))}
            placeholder="Sélectionner un propriétaire…"
          />
          {errors.proprietaire && <Text style={s.errText}>{errors.proprietaire}</Text>}

          {/* Photo */}
          <Text style={[f.label, { marginBottom: 8 }]}>Photo du terrain (optionnel)</Text>
          {photo ? (
            <View style={s.photoPreviewWrap}>
              <Image source={{ uri: photo.uri }} style={s.photoPreview} />
              <TouchableOpacity style={s.photoRemove} onPress={() => setPhoto(null)}>
                <Ionicons name="close-circle" size={28} color={Colors.primaryDark} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.photoBtn} onPress={showPhotoOptions} activeOpacity={0.7}>
              <Ionicons name="camera-outline" size={28} color={Colors.primary} />
              <Text style={s.photoBtnText}>Ajouter une photo</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[s.submit, submitting && { opacity: 0.6 }]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={s.submitText}>Enregistrer le terrain</Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 48 },

  nav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  navTitle:{ fontSize: 17, fontWeight: '700', color: Colors.text },

  gpsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  gpsBtn: { backgroundColor: Colors.primary, borderRadius: 8, width: 44, justifyContent: 'center', alignItems: 'center' },

  photoBtn: {
    borderWidth: 2, borderColor: Colors.primary + '55', borderStyle: 'dashed',
    borderRadius: 12, height: 110, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.primary + '08', marginBottom: 20, gap: 8,
  },
  photoBtnText:     { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  photoPreviewWrap: { position: 'relative', marginBottom: 20 },
  photoPreview:     { width: '100%', height: 180, borderRadius: 12 },
  photoRemove:      { position: 'absolute', top: -10, right: -10 },

  submit: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 16, marginTop: 8,
  },
  submitText:    { color: '#fff', fontWeight: '700', fontSize: 16 },
  errText:       { color: Colors.primaryDark, fontSize: 12, marginTop: -10, marginBottom: 10 },
  globalErrBox:  { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primaryDark + '15', borderRadius: 8, padding: 12, marginBottom: 16 },
  globalErrText: { flex: 1, color: Colors.primaryDark, fontSize: 13 },
});
