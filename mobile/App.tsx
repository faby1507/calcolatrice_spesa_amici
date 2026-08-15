// App.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from './src/supabase';

interface RoomItem {
  id: string;
  room_id: string;
  person_name: string;
  item_name: string;
  price: number;
  is_shared: boolean;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomTitle, setRoomTitle] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tab per la schermata iniziale: 'create' o 'join'
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [newTitle, setNewTitle] = useState('Pizzata tra Amici 🍕');
  const [newCover, setNewCover] = useState('2.00');
  const [joinCode, setJoinCode] = useState('');

  // Input per ordinazioni
  const [coverCharge, setCoverCharge] = useState(2.0);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [items, setItems] = useState<RoomItem[]>([]);

  useEffect(() => {
    if (!inRoom || !roomId) return;

    fetchItems();

    // Sottoscrizione Realtime
    const channel = supabase
      .channel(`mobile-room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_items', filter: `room_id=eq.${roomId}` },
        () => fetchItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inRoom, roomId]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('room_items')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setItems(data);
    }
  };

  // Creazione di una nuova stanza
  const handleCreateRoom = async () => {
    if (!userName.trim()) {
      Alert.alert('Attenzione', 'Inserisci prima il tuo nome!');
      return;
    }
    if (!newTitle.trim()) {
      Alert.alert('Attenzione', 'Inserisci un titolo per la serata!');
      return;
    }

    setLoading(true);
    const generatedCode = 'S-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const coverNum = parseFloat(newCover) || 0;

    const { data, error } = await supabase
      .from('rooms')
      .insert([
        {
          id: generatedCode,
          title: newTitle.trim(),
          cover_charge: coverNum,
        },
      ])
      .select()
      .single();

    setLoading(false);

    if (error) {
      Alert.alert('Errore DB', error.message);
      return;
    }

    setRoomId(data.id);
    setRoomTitle(data.title);
    setCoverCharge(data.cover_charge);
    setInRoom(true);
  };

  // Accesso a una stanza esistente
  const handleJoinRoom = async () => {
    if (!userName.trim()) {
      Alert.alert('Attenzione', 'Inserisci prima il tuo nome!');
      return;
    }
    if (!joinCode.trim()) {
      Alert.alert('Attenzione', 'Inserisci il codice della stanza!');
      return;
    }

    setLoading(true);
    const cleanCode = joinCode.trim().toUpperCase();

    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', cleanCode)
      .single();

    setLoading(false);

    if (error || !data) {
      Alert.alert('Non trovata', 'Nessuna stanza trovata con questo codice. Controlla e riprova.');
      return;
    }

    setRoomId(data.id);
    setRoomTitle(data.title);
    setCoverCharge(data.cover_charge);
    setInRoom(true);
  };

  // Aggiunta piatto / bevanda
  const handleAddItem = async () => {
    const priceNum = parseFloat(itemPrice);
    if (!itemName.trim() || isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Dati mancanti', 'Inserisci nome del piatto e prezzo valido.');
      return;
    }

    const { error } = await supabase.from('room_items').insert([
      {
        room_id: roomId,
        person_name: isShared ? 'TUTTI' : userName.trim(),
        item_name: itemName.trim(),
        price: priceNum,
        is_shared: isShared,
      },
    ]);

    if (!error) {
      setItemName('');
      setItemPrice('');
      setIsShared(false);
      fetchItems();
    } else {
      Alert.alert('Errore', error.message);
    }
  };

  const handleRemoveItem = async (id: string) => {
    await supabase.from('room_items').delete().eq('id', id);
    fetchItems();
  };

  // Calcolo Quote e Totali
  const uniqueNames = Array.from(
    new Set([
      ...items.filter((i) => !i.is_shared).map((i) => i.person_name),
      userName.trim(),
    ])
  ).filter(Boolean);

  const memberCount = uniqueNames.length || 1;
  const sharedTotal = items
    .filter((i) => i.is_shared)
    .reduce((acc, curr) => acc + Number(curr.price), 0);
  const sharedPerPerson = (sharedTotal + coverCharge * memberCount) / memberCount;
  const grandTotal = items.reduce((acc, curr) => acc + Number(curr.price), 0) + coverCharge * memberCount;

  // --- SCHERMATA INIZIALE ---
  if (!inRoom) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollCenter}>
          <View style={styles.card}>
            <Text style={styles.mainTitle}>Conto Spesa Amici 🍕</Text>
            <Text style={styles.subtitle}>Dividi pizze, bevande e coperto in tempo reale</Text>

            {/* Nome Amico */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>IL TUO NOME O SOPRANNOME</Text>
              <TextInput
                style={styles.input}
                placeholder="es. Fabiana"
                placeholderTextColor="#64748b"
                value={userName}
                onChangeText={setUserName}
              />
            </View>

            {/* Selettore Modalità */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, mode === 'create' && styles.tabActive]}
                onPress={() => setMode('create')}
              >
                <Text style={[styles.tabText, mode === 'create' && styles.tabTextActive]}>
                  Crea Stanza
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, mode === 'join' && styles.tabActive]}
                onPress={() => setMode('join')}
              >
                <Text style={[styles.tabText, mode === 'join' && styles.tabTextActive]}>
                  Entra con Codice
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Crea Stanza */}
            {mode === 'create' ? (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>NOME DELLA SERATA / TAVOLO</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="es. Pizzeria da Michele"
                    placeholderTextColor="#64748b"
                    value={newTitle}
                    onChangeText={setNewTitle}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>COPERTO A TESTA (€)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2.00"
                    placeholderTextColor="#64748b"
                    keyboardType="decimal-pad"
                    value={newCover}
                    onChangeText={setNewCover}
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleCreateRoom}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#090d16" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Crea e Apri Tavolo</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Form Entra con Codice */
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CODICE STANZA CONDIVISO</Text>
                  <TextInput
                    style={[styles.input, styles.codeInput]}
                    placeholder="es. S-ABCD"
                    placeholderTextColor="#64748b"
                    autoCapitalize="characters"
                    value={joinCode}
                    onChangeText={(val) => setJoinCode(val.toUpperCase())}
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleJoinRoom}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#090d16" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Entra nella Stanza</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- SCHERMATA TAVOLO ATTIVO ---
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.roomBadge}>CODICE: {roomId}</Text>
          <Text style={styles.roomTitleText}>{roomTitle}</Text>
          <Text style={styles.userBadge}>Sei collegato come: <Text style={styles.boldText}>{userName}</Text></Text>
        </View>
        <TouchableOpacity style={styles.exitButton} onPress={() => setInRoom(false)}>
          <Text style={styles.exitText}>Esci</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea}>
        {/* Box Inserimento */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cosa vuoi aggiungere?</Text>
          <TextInput
            style={styles.input}
            placeholder="Piatto o Bevanda (es. Pizza Diavola)"
            placeholderTextColor="#64748b"
            value={itemName}
            onChangeText={setItemName}
          />
          <TextInput
            style={styles.input}
            placeholder="Prezzo (€) es. 8.50"
            placeholderTextColor="#64748b"
            keyboardType="decimal-pad"
            value={itemPrice}
            onChangeText={setItemPrice}
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>È una spesa comune / al centro</Text>
            <Switch
              value={isShared}
              onValueChange={setIsShared}
              trackColor={{ false: '#1e293b', true: '#10b981' }}
            />
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleAddItem}>
            <Text style={styles.primaryButtonText}>Aggiungi al Conto</Text>
          </TouchableOpacity>
        </View>

        {/* Totale Generale */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>Partecipanti: {memberCount}</Text>
          <Text style={styles.totalText}>Totale: €{grandTotal.toFixed(2)}</Text>
        </View>

        {/* Quote per Persona */}
        <Text style={styles.sectionHeading}>Quote da Pagare</Text>
        <View style={styles.quoteList}>
          {uniqueNames.map((name) => {
            const personal = items.filter((i) => !i.is_shared && i.person_name.toLowerCase() === name.toLowerCase());
            const personalSum = personal.reduce((acc, curr) => acc + Number(curr.price), 0);
            const toPay = personalSum + sharedPerPerson;
            const isMe = name.toLowerCase() === userName.trim().toLowerCase();

            return (
              <View key={name} style={[styles.quoteCard, isMe && styles.myQuoteCard]}>
                <View style={styles.quoteHeader}>
                  <Text style={styles.quoteName}>{name} {isMe && '(Tu)'}</Text>
                  <Text style={styles.quoteAmount}>€{toPay.toFixed(2)}</Text>
                </View>
                <Text style={styles.quoteSub}>
                  Piatti personali: €{personalSum.toFixed(2)} | Coperto + Condivisi: €{sharedPerPerson.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Lista di Tutte le Voci */}
        <Text style={styles.sectionHeading}>Dettaglio Ordinazioni ({items.length})</Text>
        {items.length === 0 ? (
          <Text style={styles.emptyText}>Nessuna voce inserita. Aggiungi il tuo piatto!</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemTitle}>{item.item_name}</Text>
                <Text style={[styles.itemOwner, item.is_shared && styles.sharedOwner]}>
                  {item.is_shared ? '👥 Condiviso tra tutti' : item.person_name}
                </Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemPrice}>€{Number(item.price).toFixed(2)}</Text>
                <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  scrollCenter: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  scrollArea: { padding: 16 },
  header: { padding: 16, backgroundColor: '#131c2e', borderBottomWidth: 1, borderColor: '#1e293b', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomBadge: { color: '#10b981', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  roomTitleText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginVertical: 2 },
  userBadge: { color: '#94a3b8', fontSize: 12 },
  boldText: { color: '#ffffff', fontWeight: 'bold' },
  exitButton: { backgroundColor: '#1e293b', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  exitText: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#131c2e', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b', marginBottom: 16 },
  mainTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 4, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff', marginBottom: 12 },
  inputGroup: { marginBottom: 14 },
  label: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
  input: { backgroundColor: '#090d16', color: '#ffffff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', fontSize: 15, marginBottom: 10 },
  codeInput: { textAlign: 'center', fontWeight: 'bold', fontSize: 18, letterSpacing: 2, color: '#10b981' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#090d16', padding: 4, borderRadius: 12, marginBottom: 16 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#1e293b' },
  tabText: { color: '#64748b', fontWeight: 'bold', fontSize: 13 },
  tabTextActive: { color: '#ffffff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  switchLabel: { color: '#cbd5e1', fontSize: 14 },
  primaryButton: { backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  primaryButtonText: { color: '#090d16', fontWeight: '900', fontSize: 15 },
  summaryBar: { backgroundColor: '#131c2e', padding: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#1e293b' },
  summaryText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  totalText: { color: '#10b981', fontSize: 18, fontWeight: '900' },
  sectionHeading: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginVertical: 10 },
  quoteList: { gap: 10, marginBottom: 16 },
  quoteCard: { backgroundColor: '#131c2e', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#1e293b' },
  myQuoteCard: { borderColor: '#10b981', backgroundColor: '#0e2428' },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quoteName: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  quoteAmount: { color: '#10b981', fontSize: 18, fontWeight: '900' },
  quoteSub: { color: '#94a3b8', fontSize: 11, marginTop: 4 },
  emptyText: { color: '#64748b', textAlign: 'center', paddingVertical: 20, fontSize: 13 },
  itemRow: { backgroundColor: '#131c2e', padding: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#1e293b' },
  itemLeft: { flex: 1 },
  itemTitle: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  itemOwner: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  sharedOwner: { color: '#f59e0b', fontWeight: '600' },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemPrice: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  deleteBtn: { color: '#ef4444', fontSize: 18, paddingHorizontal: 6 },
});