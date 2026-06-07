import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import Colors from '../../src/constants/colors';

// ── Reusable searchable select ────────────────────────────────────────────────

function SearchableSelect({ items, selected, onSelect, placeholder, label, renderLabel }) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);

  const filtered = query.length >= 1
    ? items.filter(i => renderLabel(i).toLowerCase().includes(query.toLowerCase()))
    : items;
  const selectedItem = items.find(i => i.id === selected);

  return (
    <View style={{ marginBottom: 16, zIndex: open ? 100 : 1 }}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity
        style={[s.trigger, open && { borderColor: Colors.primary }]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.8}
      >
        <Text style={selectedItem ? s.selected : s.placeholder}>
          {selectedItem ? renderLabel(selectedItem) : placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.muted} />
      </TouchableOpacity>
      {open && (
        <View style={s.dropdown}>
          <TextInput
            style={s.searchInput}
            placeholder="Rechercher…"
            placeholderTextColor={Colors.muted}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {filtered.slice(0, 6).map(item => (
            <TouchableOpacity
              key={item.id}
              style={[s.option, selected === item.id && s.optionActive]}
              onPress={() => { onSelect(item.id); setOpen(false); setQuery(''); }}
            >
              <Text style={s.optionText}>{renderLabel(item)}</Text>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && <Text style={s.emptyOption}>Aucun résultat</Text>}
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NouvelleTransaction() {
  const [terrains,      setTerrains]      = useState([]);
  const [proprietaires, setProprietaires] = useState([]);
  const [form, setForm] = useState({
    terrain:  null,
    vendeur:  null,
    acheteur: null,
    montant:  '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState({});
  const [result,     setResult]     = useState(null); // { signature, terrain_id }

  useEffect(() => {
    Promise.all([
      api.get('/api/terrains/'),
      api.get('/api/proprietaires/'),
    ]).then(([tRes, pRes]) => {
      setTerrains(tRes.data.results ?? tRes.data);
      setProprietaires(pRes.data.results ?? pRes.data);
    }).catch(() => {});
  }, []);

  async function submit() {
    const errs = {};
    if (!form.terrain)        errs.terrain  = 'Terrain requis';
    if (!form.vendeur)        errs.vendeur  = 'Vendeur requis';
    if (!form.acheteur)       errs.acheteur = 'Acheteur requis';
    if (!form.montant.trim()) errs.montant  = 'Montant requis';
    if (form.vendeur && form.vendeur === form.acheteur) errs.acheteur = 'Le vendeur et l\'acheteur ne peuvent pas être identiques';

    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);

    try {
      const { data } = await api.post('/api/transactions/', {
        terrain:  form.terrain,
        vendeur:  form.vendeur,
        acheteur: form.acheteur,
        montant:  parseFloat(form.montant.replace(',', '.')),
      });
      setResult({ signature: data.signature_numerique, terrainId: data.terrain });
    } catch (err) {
      const d = err.response?.data;
      if (d && typeof d === 'object' && !d.detail) {
        setErrors(d);
      } else {
        Alert.alert('Erreur', d?.detail ?? 'Impossible d\'enregistrer la transaction.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success view ─────────────────────────────────────────────────────────────
  if (result) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={s.navTitle}>Transaction créée</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={[s.scroll, { alignItems: 'center', justifyContent: 'center', flex: 1 }]}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.primary} />
          </View>
          <Text style={s.successTitle}>Transaction enregistrée !</Text>
          <Text style={s.successSub}>
            La transaction a été ajoutée à la blockchain TrustLand.
          </Text>

          <View style={s.hashCard}>
            <Text style={s.hashLabel}>Hash blockchain</Text>
            <Text style={s.hashValue} selectable>{result.signature}</Text>
          </View>

          <TouchableOpacity
            style={[s.btn, { marginTop: 24 }]}
            onPress={() => router.replace(`/terrain/${result.terrainId}`)}
            activeOpacity={0.8}
          >
            <Ionicons name="layers" size={18} color="#fff" />
            <Text style={s.btnText}>Voir le terrain</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: Colors.muted, marginTop: 10 }]}
            onPress={() => router.replace('/(tabs)/terrains')}
            activeOpacity={0.8}
          >
            <Text style={s.btnText}>Retour aux terrains</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={s.navTitle}>Nouvelle transaction</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <SearchableSelect
            label="Terrain *"
            items={terrains}
            selected={form.terrain}
            onSelect={id => setForm(p => ({ ...p, terrain: id }))}
            placeholder="Sélectionner un terrain…"
            renderLabel={t => t.adresse}
          />
          {errors.terrain && <Text style={s.errText}>{errors.terrain}</Text>}

          <SearchableSelect
            label="Vendeur *"
            items={proprietaires}
            selected={form.vendeur}
            onSelect={id => setForm(p => ({ ...p, vendeur: id }))}
            placeholder="Sélectionner le vendeur…"
            renderLabel={p => `${p.prenom} ${p.nom}`}
          />
          {errors.vendeur && <Text style={s.errText}>{errors.vendeur}</Text>}

          <SearchableSelect
            label="Acheteur *"
            items={proprietaires}
            selected={form.acheteur}
            onSelect={id => setForm(p => ({ ...p, acheteur: id }))}
            placeholder="Sélectionner l'acheteur…"
            renderLabel={p => `${p.prenom} ${p.nom}`}
          />
          {errors.acheteur && <Text style={s.errText}>{errors.acheteur}</Text>}

          <Text style={s.label}>Montant (FCFA) *</Text>
          <TextInput
            style={s.input}
            placeholder="Ex : 5000000"
            placeholderTextColor={Colors.muted}
            value={form.montant}
            onChangeText={v => setForm(p => ({ ...p, montant: v }))}
            keyboardType="numeric"
          />
          {errors.montant && <Text style={s.errText}>{errors.montant}</Text>}

          <TouchableOpacity
            style={[s.btn, submitting && { opacity: 0.6 }, { marginTop: 16 }]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={s.btnText}>Enregistrer la transaction</Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 48 },

  nav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  navTitle:{ fontSize: 17, fontWeight: '700', color: Colors.text },

  label:       { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input:       { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: Colors.text, backgroundColor: Colors.bg, marginBottom: 16 },
  trigger:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: Colors.bg },
  selected:    { fontSize: 15, color: Colors.text, flex: 1 },
  placeholder: { fontSize: 15, color: Colors.muted, flex: 1 },
  dropdown:    { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, backgroundColor: Colors.surface, marginTop: 4, overflow: 'hidden', elevation: 4 },
  searchInput: { borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.text },
  option:      { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border + '66' },
  optionActive:{ backgroundColor: Colors.primary + '12' },
  optionText:  { fontSize: 14, color: Colors.text },
  emptyOption: { padding: 12, color: Colors.muted, textAlign: 'center' },
  errText:     { color: Colors.primaryDark, fontSize: 12, marginTop: -10, marginBottom: 10 },

  btn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  successIcon:  { marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  successSub:   { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  hashCard:     { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, width: '100%', borderLeftWidth: 4, borderLeftColor: Colors.primary },
  hashLabel:    { fontSize: 11, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', marginBottom: 6 },
  hashValue:    { fontSize: 12, color: Colors.text, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', lineHeight: 18 },
});
