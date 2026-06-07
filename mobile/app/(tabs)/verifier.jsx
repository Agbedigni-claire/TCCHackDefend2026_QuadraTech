import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/api/axios';
import Colors from '../../src/constants/colors';

const MIME_ALLOWED = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
];

function FileRow({ file, onRemove }) {
  const isImage = file.mimeType?.startsWith('image/');
  return (
    <View style={s.fileRow}>
      <Ionicons
        name={isImage ? 'image-outline' : 'document-outline'}
        size={28}
        color={Colors.primary}
        style={{ marginRight: 10 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
        <Text style={s.fileSize}>{(file.size / 1024).toFixed(1)} Ko — {file.mimeType}</Text>
      </View>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close-circle" size={22} color={Colors.primaryDark} />
      </TouchableOpacity>
    </View>
  );
}

function ResultRow({ item }) {
  const ok = item.valide;
  return (
    <View style={[s.resultRow, { borderLeftColor: ok ? Colors.primary : Colors.primaryDark }]}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'close-circle'}
        size={22}
        color={ok ? Colors.primary : Colors.primaryDark}
        style={{ marginRight: 10 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={s.resultFile} numberOfLines={1}>{item.fichier}</Text>
        <Text style={[s.resultStatus, { color: ok ? Colors.primary : Colors.primaryDark }]}>
          {ok ? 'Document valide' : item.erreur ?? 'Document invalide ou non reconnu'}
        </Text>
        {item.type_document && (
          <Text style={s.resultMeta}>Type détecté : {item.type_document}</Text>
        )}
        {item.terrain && (
          <Text style={s.resultMeta}>Terrain associé : {item.terrain}</Text>
        )}
      </View>
    </View>
  );
}

export default function Verifier() {
  const [files,    setFiles]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [results,  setResults]  = useState(null);
  const [error,    setError]    = useState(null);

  async function pickDocument() {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: MIME_ALLOWED,
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const picked = result.assets ?? [];
      const oversized = picked.filter(f => f.size > 10 * 1024 * 1024);
      if (oversized.length) {
        setError(`Fichier(s) trop volumineux (max 10 Mo) : ${oversized.map(f => f.name).join(', ')}`);
        return;
      }

      setFiles(prev => {
        const existing = new Set(prev.map(f => f.name + f.size));
        const nouveaux = picked.filter(f => !existing.has(f.name + f.size));
        return [...prev, ...nouveaux];
      });
      setResults(null);
    } catch (e) {
      setError("Impossible d'ouvrir le sélecteur de fichiers.");
    }
  }

  async function verify() {
    if (!files.length) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const form = new FormData();
      files.forEach(f => {
        form.append('fichiers', {
          uri:  f.uri,
          name: f.name,
          type: f.mimeType ?? 'application/octet-stream',
        });
      });

      const { data } = await api.post('/api/documents/verifier/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResults(Array.isArray(data) ? data : data.resultats ?? []);
    } catch (err) {
      const msg = err.response?.data?.detail ?? err.response?.data?.error ?? 'Erreur lors de la vérification.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFiles([]);
    setResults(null);
    setError(null);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* En-tête */}
        <View style={s.header}>
          <View style={s.iconWrap}>
            <Ionicons name="shield-checkmark" size={32} color={Colors.primary} />
          </View>
          <Text style={s.title}>Vérification de documents</Text>
          <Text style={s.subtitle}>
            Importez un ou plusieurs fichiers (PDF, JPEG, PNG) pour vérifier leur authenticité sur la blockchain TrustLand.
          </Text>
        </View>

        {/* Zone de sélection */}
        {!results && (
          <>
            <TouchableOpacity style={s.dropzone} onPress={pickDocument} activeOpacity={0.7}>
              <Ionicons name="cloud-upload-outline" size={40} color={Colors.primary} />
              <Text style={s.dropTitle}>Sélectionner des fichiers</Text>
              <Text style={s.dropHint}>PDF, JPEG ou PNG — 10 Mo max par fichier</Text>
            </TouchableOpacity>

            {files.length > 0 && (
              <View style={s.fileList}>
                <Text style={s.fileListTitle}>{files.length} fichier(s) sélectionné(s)</Text>
                {files.map((f, i) => (
                  <FileRow
                    key={`${f.name}-${i}`}
                    file={f}
                    onRemove={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                  />
                ))}
              </View>
            )}

            {error && (
              <View style={s.errorBox}>
                <Ionicons name="warning-outline" size={18} color={Colors.primaryDark} style={{ marginRight: 6 }} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.btn, (!files.length || loading) && s.btnDisabled]}
              onPress={verify}
              disabled={!files.length || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={s.btnText}>Vérifier {files.length > 0 ? `(${files.length})` : ''}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Résultats */}
        {results && (
          <>
            <Text style={s.resultsTitle}>Résultats</Text>
            {results.length === 0 ? (
              <Text style={s.empty}>Aucun résultat retourné par le serveur.</Text>
            ) : (
              results.map((r, i) => <ResultRow key={i} item={r} />)
            )}

            <TouchableOpacity style={[s.btn, { backgroundColor: Colors.muted, marginTop: 8 }]} onPress={reset} activeOpacity={0.8}>
              <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={s.btnText}>Nouvelle vérification</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20, paddingBottom: 48 },

  header: { alignItems: 'center', marginBottom: 24 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  title:    { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20 },

  dropzone: {
    borderWidth: 2,
    borderColor: Colors.primary + '55',
    borderStyle: 'dashed',
    borderRadius: 16,
    backgroundColor: Colors.primary + '08',
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  dropTitle: { fontSize: 15, fontWeight: '700', color: Colors.primary, marginTop: 10 },
  dropHint:  { fontSize: 12, color: Colors.muted, marginTop: 4 },

  fileList:      { marginBottom: 16 },
  fileListTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  fileRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 10,
    padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  fileName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  fileSize:  { fontSize: 11, color: Colors.muted, marginTop: 2 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primaryDark + '15', borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  errorText: { fontSize: 13, color: Colors.primaryDark, flex: 1 },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16, borderRadius: 12, marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },

  resultsTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  resultRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: Colors.surface, borderRadius: 10,
    padding: 14, marginBottom: 10, borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  resultFile:   { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  resultStatus: { fontSize: 13, fontWeight: '600' },
  resultMeta:   { fontSize: 12, color: Colors.muted, marginTop: 2 },

  empty: { color: Colors.muted, textAlign: 'center', marginVertical: 24 },
});
