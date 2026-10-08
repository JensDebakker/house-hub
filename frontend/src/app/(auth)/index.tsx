import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { ScreenContainer } from '@/components/ScreenContainer';

export default function AuthLandingScreen() {
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 32, fontWeight: '700' }}>House Hub</Text>
      <Text style={{ color: '#666', marginBottom: 8 }}>
        Manage your household — tasks, shopping, supplies, and more.
      </Text>

      <Pressable
        onPress={() => router.push('/(auth)/login')}
        style={({ pressed }) => [cardStyle, pressed && { opacity: 0.85 }]}
      >
        <Text style={{ fontSize: 22, fontWeight: '700', color: 'white' }}>Log in</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
          Already have an account? Welcome back.
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/(auth)/register')}
        style={({ pressed }) => [cardStyle, secondaryCardStyle, pressed && { opacity: 0.85 }]}
      >
        <Text style={{ fontSize: 22, fontWeight: '700' }}>Register</Text>
        <Text style={{ color: '#666', marginTop: 4 }}>New here? Create an account.</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const cardStyle = {
  backgroundColor: '#2563eb',
  borderRadius: 16,
  padding: 24,
  marginTop: 8,
};

const secondaryCardStyle = {
  backgroundColor: '#f3f4f6',
};
