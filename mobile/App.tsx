import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, View, Pressable, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from './src/firebase';
import { apiGet, apiPost } from './src/api';

type Provider = {
  id: string;
  name: string;
  bio: string;
  categories: string[];
  location: { city: string };
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async () => {
      setLoading(false);
    });
    return unsub;
  }, []);

  async function ensureSignedIn() {
    if (auth.currentUser) return;
    await signInAnonymously(auth);
  }

  async function loadProviders() {
    setError(null);
    try {
      const health = await apiGet('/health');
      console.log('health:', health);
      const list = await apiGet('/providers');
      setProviders(list);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  async function createTestBooking() {
    if (!selectedProvider) return;
    setError(null);
    try {
      await ensureSignedIn();
      // Create a booking using the first service shown by the provider.
      const providerFull = await apiGet(`/providers/${selectedProvider.id}`);
      const service = providerFull.services?.[0];
      if (!service) throw new Error('Provider has no services');

      const payload = {
        providerId: selectedProvider.id,
        service,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: notes || undefined,
      };

      const booking = await apiPost('/bookings', payload, true);
      alert(`Booking created: ${booking.id}`);
      setNotes('');
    } catch (e: any) {
      setError(e.message || String(e));
    }
  }

  useEffect(() => {
    loadProviders();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '600' }}>BeautyBooking (MVP)</Text>

      <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
        <Pressable onPress={loadProviders} style={{ padding: 12, borderRadius: 10, backgroundColor: '#111' }}>
          <Text style={{ color: 'white' }}>Refresh providers</Text>
        </Pressable>
        <Pressable onPress={ensureSignedIn} style={{ padding: 12, borderRadius: 10, backgroundColor: '#333' }}>
          <Text style={{ color: 'white' }}>{auth.currentUser ? 'Signed in' : 'Anonymous sign-in'}</Text>
        </Pressable>
      </View>

      {error ? <Text style={{ color: 'crimson', marginTop: 10 }}>{error}</Text> : null}

      <Text style={{ marginTop: 16, fontSize: 18, fontWeight: '600' }}>Providers</Text>

      <FlatList
        style={{ marginTop: 8 }}
        data={providers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setSelectedProvider(item)}
            style={{
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: selectedProvider?.id === item.id ? '#111' : '#ddd',
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
            <Text style={{ opacity: 0.8 }}>{item.location?.city}</Text>
            <Text numberOfLines={2} style={{ marginTop: 6, opacity: 0.8 }}>
              {item.bio}
            </Text>
            <Text style={{ marginTop: 6, opacity: 0.7 }}>
              {Array.isArray(item.categories) ? item.categories.join(', ') : ''}
            </Text>
          </Pressable>
        )}
      />

      <View style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>
          Create test booking {selectedProvider ? `with ${selectedProvider.name}` : '(select a provider)'}
        </Text>

        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          style={{ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 10, marginTop: 8 }}
        />

        <Pressable
          disabled={!selectedProvider}
          onPress={createTestBooking}
          style={{
            padding: 12,
            borderRadius: 10,
            backgroundColor: selectedProvider ? '#111' : '#aaa',
            marginTop: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white' }}>Create booking (requires sign-in)</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
