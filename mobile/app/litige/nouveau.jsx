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

export default function NouveauLitige() {
  const [terrains,      setTerrains]      = useState([]);
  const [proprietaires, setProprietaires] = useState([]);
  const [form, setForm] = useState({ terrain: null, declarant: null, description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/api/terrains/'),
      api.get('/api/proprietaires/'),
    ]).then(([tRes, pRes]) => {
      setTerrains(tRes.data.results ?? tRes.data);
      setProprietaires(pRes.data.results ?? pRes.data);
    }).catch(() => {});
  }, []);

  function confirmSubmit() {
    const errs = {};
    if (!form.terrain)             errs.terrain     = 'Terrain requis';
    if (!form.declarant)           errs.declarant   = 'Déclarant requis';
    if (!form.description.trim())  errs.description = 'Description requise';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    Alert.alert(
      'Confirmer le litige',
      `Voulez-vous déclarer un litige sur ce terrain ?\n\nCette action ne peut pas être annulée.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'destructive', onPress: submit },
      ]
    );
  }

  async function submit() {
    setSubmitting(true);
    try {
      await api.post('/api/litiges/', {
        terrain:     form.terrain,
        declarant:   form.declarant,
        description: form.description.trim(),
      });
      Alert.alert(
        'Litige enregistré',
        'Le litige a été déclaré avec succès.',
        [{ text: 'OK', onPress: () => router.replace(`/terrain/${form.terrain}`) }]
      );
    } catch (err) {
      const d = err.response?.data;
      if (d && typeof d === 'object' && !d.detail) {
        setErrors(d);
      } else {
        Alert.alert('Erreur', d?.detail ?? 'Impossible d\'enregistrer le litige.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.nav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={s.navTitle}>Nouveau litige</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Warning banner */}
          <View style={s.warnBanner}>
            <Ionicons name="warning" size={20} color={Colors.primary} />
            <Text style={s.warnText}>
              Un litige déclaré bloque toute transaction sur le terrain jusqu'à sa résolution.
            </Text>
          </View>

          <SearchableSelect
            label="Terrain concerné *"
            items={terrains}
            selected={form.terrain}
            onSelect={id => setForm(p => ({ ...p, terrain: id }))}
            placeholder="Sélectionner le terrain…"
            renderLabel={t => t.adresse}
          />
          {errors.terrain && <Text style={s.errText}>{errors.terrain}</Text>}

          <SearchableSelect
            label="Déclarant (propriétaire) *"
            items={proprietaires}
            selected={form.declarant}
            onSelect={id => setForm(p => ({ ...p, declarant: id }))}
            placeholder="Sélectionner le déclarant…"
            renderLabel={p => `${p.prenom} ${p.nom}`}
          />
          {errors.declarant && <Text style={s.errText}>{errors.declarant}</Text>}

          <Text style={s.label}>Description du litige *</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Décrivez le motif du litige, les parties impliquées, les faits…"
            placeholderTextColor={Colors.muted}
            value={form.description}
            onChangeText={v => setForm(p => ({ ...p, description: v }))}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          {errors.description && <Text style={s.errText}>{errors.description}</Text>}

          <TouchableOpacity
            style={[s.btn, submitting && { opacity: 0.6 }, { marginTop: 8 }]}
            onPress={confirmSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="alert-circle" size={20} color="#fff" />
                  <Text style={s.btnText}>Déclarer le litige</Text>
                </>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  scroll:  { padding: 20, paddingBottom: 48 },

  nav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  navTitle:{ fontSize: 17, fontWeight: '700', color: Colors.text },

  warnBanner: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: Colors.primary + '18', borderRadius: 10, padding: 12, marginBottom: 20 },
  warnText:   { flex: 1, fontSize: 13, color: Colors.primary, lineHeight: 18, fontWeight: '500' },

  label:       { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input:       { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: Colors.text, backgroundColor: Colors.bg, marginBottom: 16 },
  textarea:    { height: 140, textAlignVertical: 'top' },
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

  btn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primaryDark, borderRadius: 12, paddingVertical: 16 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
