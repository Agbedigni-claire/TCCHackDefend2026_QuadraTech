import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Image,
  TouchableOpacity, Modal, TextInput, FlatList,
  ActivityIndicator, Alert, Linking, Platform,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../src/api/axios';
import Colors from '../../src/constants/colors';
import { API_BASE_URL } from '../../src/constants/config';

const STATUT_LABELS = {
  libre:          'Libre',
  en_transaction: 'En transaction',
  litige:         'En litige',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtDatetime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatutBadge({ statut }) {
  const color = Colors.statut[statut] ?? Colors.muted;
  const bg    = Colors.statutBg[statut] ?? '#f1f5f9';
  return (
    <View style={[badge.wrap, { backgroundColor: bg }]}>
      <View style={[badge.dot, { backgroundColor: color }]} />
      <Text style={[badge.text, { color }]}>{STATUT_LABELS[statut] ?? statut}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  dot:  { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '600' },
});

// ── Section InfoRow ───────────────────────────────────────────────────────────
function InfoRow({ label, value, mono }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, mono && s.mono]} selectable>{value ?? '—'}</Text>
    </View>
  );
}

// ── Section Transactions ──────────────────────────────────────────────────────
function TransactionItem({ tx }) {
  return (
    <View style={s.txItem}>
      <View style={s.txRow}>
        <Ionicons name="swap-horizontal" size={16} color={Colors.primary} />
        <Text style={s.txParties} numberOfLines={1}>
          {tx.vendeur} → {tx.acheteur}
        </Text>
      </View>
      <View style={s.txMeta}>
        <Text style={s.txMontant}>{parseFloat(tx.montant).toLocaleString('fr-FR')} FCFA</Text>
        <Text style={s.txDate}>{fmtDate(tx.date_transaction)}</Text>
      </View>
    </View>
  );
}

// ── Section Litiges ───────────────────────────────────────────────────────────
function LitigeItem({ litige }) {
  const isResolu = litige.statut === 'resolu';
  return (
    <View style={[s.litigeItem, isResolu && s.litigeResolu]}>
      <View style={s.litigeHeader}>
        <Ionicons
          name={isResolu ? 'checkmark-circle' : 'warning'}
          size={16}
          color={isResolu ? Colors.primary : Colors.primaryDark}
        />
        <Text style={[s.litigeStatut, { color: isResolu ? Colors.primary : Colors.primaryDark }]}>
          {isResolu ? 'Résolu' : 'Ouvert'}
        </Text>
        <Text style={s.litigeDate}>{fmtDate(litige.date_declaration)}</Text>
      </View>
      <Text style={s.litigeDesc} numberOfLines={3}>{litige.description}</Text>
      {isResolu && litige.resolution ? (
        <Text style={s.litigeReso}>↳ {litige.resolution}</Text>
      ) : null}
    </View>
  );
}

// ── Modal Signaler Litige ─────────────────────────────────────────────────────
function LitigeModal({ visible, terrainId, onClose, onSuccess }) {
  const [proprietaires, setProprietaires] = useState([]);
  const [declarant,     setDeclarant]     = useState(null);
  const [description,   setDescription]   = useState('');
  const [busy,          setBusy]          = useState(false);
  const [error,         setError]         = useState(null);
  const [step,          setStep]          = useState('form'); // 'form' | 'pick'

  useEffect(() => {
    if (visible) {
      setDescription('');
      setDeclarant(null);
      setError(null);
      setStep('form');
      api.get('/api/proprietaires/').then(({ data }) => setProprietaires(data.results ?? data)).catch(() => {});
    }
  }, [visible]);

  async function submit() {
    if (!declarant) { setError('Choisissez un déclarant.'); return; }
    if (!description.trim()) { setError('La description est obligatoire.'); return; }
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/litiges/', { terrain: terrainId, declarant: declarant.id, description: description.trim() });
      onSuccess?.();
      onClose();
    } catch (err) {
      const d = err.response?.data;
      setError(d ? Object.values(d).flat().join(' ') : 'Erreur lors de la déclaration.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={m.safe} edges={['top']}>
        <View style={m.header}>
          <Text style={m.title}>Signaler un litige</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={m.scroll} contentContainerStyle={m.content} keyboardShouldPersistTaps="handled">
          {error && <View style={m.errorBox}><Text style={m.errorText}>{error}</Text></View>}

          {/* Déclarant */}
          <Text style={m.label}>Déclarant (propriétaire)</Text>
          <TouchableOpacity style={m.selectBtn} onPress={() => setStep(step === 'pick' ? 'form' : 'pick')} activeOpacity={0.7}>
            <Text style={declarant ? m.selectValue : m.selectPlaceholder}>
              {declarant ? `${declarant.prenom} ${declarant.nom}` : '— Choisir un propriétaire —'}
            </Text>
            <Ionicons name={step === 'pick' ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.muted} />
          </TouchableOpacity>

          {step === 'pick' && (
            <View style={m.dropdown}>
              {proprietaires.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[m.dropItem, declarant?.id === p.id && m.dropItemActive]}
                  onPress={() => { setDeclarant(p); setStep('form'); }}
                >
                  <Text style={[m.dropText, declarant?.id === p.id && m.dropTextActive]}>
                    {p.prenom} {p.nom}
                  </Text>
                  {declarant?.id === p.id && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
              {proprietaires.length === 0 && <Text style={m.dropEmpty}>Aucun propriétaire disponible</Text>}
            </View>
          )}

          {/* Description */}
          <Text style={m.label}>Description du litige</Text>
          <TextInput
            style={m.textarea}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            placeholder="Décrivez le litige en détail…"
            placeholderTextColor={Colors.muted}
            textAlignVertical="top"
          />

          <TouchableOpacity style={[m.submitBtn, busy && m.submitDisabled]} onPress={submit} disabled={busy}>
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text style={m.submitText}>Déclarer le litige</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const m = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: Colors.surface },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:           { fontSize: 18, fontWeight: '700', color: Colors.text },
  scroll:          { flex: 1 },
  content:         { padding: 20, gap: 0 },
  errorBox:        { backgroundColor: '#dbeafe', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText:       { color: '#1e40af', fontSize: 13 },
  label:           { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 16 },
  selectBtn:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: Colors.bg },
  selectValue:     { fontSize: 14, color: Colors.text, flex: 1 },
  selectPlaceholder: { fontSize: 14, color: Colors.muted, flex: 1 },
  dropdown:        { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, marginTop: 4, overflow: 'hidden', backgroundColor: Colors.surface },
  dropItem:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropItemActive:  { backgroundColor: Colors.primary + '0f' },
  dropText:        { fontSize: 14, color: Colors.text },
  dropTextActive:  { color: Colors.primary, fontWeight: '600' },
  dropEmpty:       { padding: 12, color: Colors.muted, fontSize: 14 },
  textarea:        { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: Colors.text, backgroundColor: Colors.bg, height: 120, marginBottom: 4 },
  submitBtn:       { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  submitDisabled:  { opacity: 0.7 },
  submitText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
});

// ── Page principale ───────────────────────────────────────────────────────────
export default function TerrainDetail() {
  const { id } = useLocalSearchParams();

  const [terrain,     setTerrain]     = useState(null);
  const [historique,  setHistorique]  = useState([]);
  const [litiges,     setLitiges]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [certLoading, setCertLoading] = useState(false);
  const [litigeModal, setLitigeModal] = useState(false);
  const [activeTab,   setActiveTab]   = useState('infos');

  async function load() {
    setError(false);
    try {
      const [tRes, hRes, lRes] = await Promise.all([
        api.get(`/api/terrains/${id}/`),
        api.get(`/api/terrains/${id}/historique/`),
        api.get(`/api/terrains/${id}/litiges/`),
      ]);
      setTerrain(tRes.data);
      setHistorique(hRes.data);
      setLitiges(lRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function downloadCertificat() {
    setCertLoading(true);
    try {
      const token = await AsyncStorage.getItem('access');
      const url   = `${API_BASE_URL}/api/terrains/${id}/certificat/`;
      const dest  = FileSystem.documentDirectory + `certificat-${terrain.id_unique}.pdf`;

      const result = await FileSystem.downloadAsync(url, dest, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', dialogTitle: 'Certificat de propriété' });
      } else {
        Alert.alert('Téléchargé', `Certificat enregistré dans les fichiers de l'application.`);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de télécharger le certificat.');
    } finally {
      setCertLoading(false);
    }
  }

  const transactions = historique.filter(e => e.type === 'transaction');
  const prop = terrain?.proprietaire_actuel_detail;
  const qrUri = terrain?.qr_code ? `${API_BASE_URL}${terrain.qr_code.startsWith('/') ? '' : '/'}${terrain.qr_code}` : null;

  const TABS = [
    { key: 'infos',         label: 'Infos' },
    { key: 'transactions',  label: `Transactions (${transactions.length})` },
    { key: 'litiges',       label: `Litiges (${litiges.length})` },
  ];

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !terrain) {
    return (
      <View style={s.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.muted} />
        <Text style={s.errorMsg}>Terrain introuvable ou accès refusé</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: terrain.adresse.slice(0, 30) + (terrain.adresse.length > 30 ? '…' : '') }} />

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>

        {/* Statut + adresse */}
        <View style={s.topCard}>
          <StatutBadge statut={terrain.statut} />
          <Text style={s.adresse}>{terrain.adresse}</Text>
          <Text style={s.idUnique}>{terrain.id_unique}</Text>
        </View>

        {/* QR Code */}
        {qrUri && (
          <View style={s.qrCard}>
            <Image source={{ uri: qrUri }} style={s.qrImage} resizeMode="contain" />
            <Text style={s.qrCaption}>QR Code du terrain</Text>
          </View>
        )}

        {/* Bouton certificat */}
        <TouchableOpacity
          style={[s.certBtn, certLoading && s.certBtnDisabled]}
          onPress={downloadCertificat}
          disabled={certLoading}
          activeOpacity={0.8}
        >
          {certLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Ionicons name="document-text-outline" size={18} color="#fff" />
          }
          <Text style={s.certBtnText}>
            {certLoading ? 'Génération…' : 'Télécharger le certificat PDF'}
          </Text>
        </TouchableOpacity>

        {/* Onglets */}
        <View style={s.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, activeTab === t.key && s.tabActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[s.tabText, activeTab === t.key && s.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Onglet : Infos */}
        {activeTab === 'infos' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Terrain</Text>
            <InfoRow label="Superficie"      value={`${parseFloat(terrain.superficie).toLocaleString('fr-FR')} m²`} />
            <InfoRow label="Coordonnées GPS" value={terrain.coordonnees_gps} mono />
            <InfoRow label="Enregistré le"   value={fmtDate(terrain.date_enregistrement)} />

            {prop && (
              <>
                <Text style={[s.cardTitle, { marginTop: 16 }]}>Propriétaire actuel</Text>
                <InfoRow label="Nom"   value={`${prop.prenom} ${prop.nom}`} />
                <InfoRow label="Email" value={prop.email} />
              </>
            )}
          </View>
        )}

        {/* Onglet : Transactions */}
        {activeTab === 'transactions' && (
          <View style={s.card}>
            {transactions.length === 0 ? (
              <Text style={s.emptyText}>Aucune transaction enregistrée.</Text>
            ) : (
              transactions.map((tx, i) => <TransactionItem key={i} tx={tx} />)
            )}
          </View>
        )}

        {/* Onglet : Litiges */}
        {activeTab === 'litiges' && (
          <View style={s.card}>
            <TouchableOpacity style={s.signaleBtn} onPress={() => setLitigeModal(true)} activeOpacity={0.8}>
              <Ionicons name="warning-outline" size={18} color="#fff" />
              <Text style={s.signalerText}>Signaler un litige</Text>
            </TouchableOpacity>

            {litiges.length === 0 ? (
              <Text style={s.emptyText}>Aucun litige pour ce terrain.</Text>
            ) : (
              litiges.map(l => <LitigeItem key={l.id} litige={l} />)
            )}
          </View>
        )}

      </ScrollView>

      <LitigeModal
        visible={litigeModal}
        terrainId={terrain.id}
        onClose={() => setLitigeModal(false)}
        onSuccess={() => {
          load();
          Alert.alert('Succès', 'Le litige a été déclaré.');
        }}
      />
    </>
  );
}

const s = StyleSheet.create({
  scroll:       { flex: 1, backgroundColor: Colors.bg },
  content:      { padding: 16, paddingBottom: 40, gap: 12 },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  errorMsg:     { fontSize: 15, color: Colors.muted, textAlign: 'center' },

  topCard:      { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, gap: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  adresse:      { fontSize: 18, fontWeight: '800', color: Colors.text, lineHeight: 24 },
  idUnique:     { fontSize: 11, color: Colors.muted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  qrCard:       { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  qrImage:      { width: 160, height: 160 },
  qrCaption:    { fontSize: 11, color: Colors.muted, marginTop: 6 },

  certBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 13 },
  certBtnDisabled: { opacity: 0.7 },
  certBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },

  tabBar:       { flexDirection: 'row', gap: 6 },
  tab:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tabActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText:      { fontSize: 12, fontWeight: '600', color: Colors.muted },
  tabTextActive:{ color: '#fff' },

  card:         { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTitle:    { fontSize: 12, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  infoLabel:    { fontSize: 13, color: Colors.muted, flex: 1 },
  infoValue:    { fontSize: 13, color: Colors.text, fontWeight: '600', flex: 2, textAlign: 'right' },
  mono:         { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11 },

  txItem:       { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  txRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  txParties:    { flex: 1, fontSize: 13, color: Colors.text, fontWeight: '600' },
  txMeta:       { flexDirection: 'row', justifyContent: 'space-between' },
  txMontant:    { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  txDate:       { fontSize: 12, color: Colors.muted },

  litigeItem:   { backgroundColor: '#eff6ff', borderRadius: 8, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: Colors.primaryDark },
  litigeResolu: { backgroundColor: '#dbeafe', borderLeftColor: Colors.primary },
  litigeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  litigeStatut: { fontSize: 12, fontWeight: '700' },
  litigeDate:   { fontSize: 12, color: Colors.muted, marginLeft: 'auto' },
  litigeDesc:   { fontSize: 13, color: Colors.text, lineHeight: 18 },
  litigeReso:   { fontSize: 12, color: Colors.primary, marginTop: 6, fontStyle: 'italic' },

  signaleBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primaryDark, borderRadius: 8, paddingVertical: 12, marginBottom: 16 },
  signalerText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyText:    { fontSize: 14, color: Colors.muted, textAlign: 'center', paddingVertical: 16 },
});
