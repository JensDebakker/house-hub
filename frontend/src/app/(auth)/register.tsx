import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { Module } from '@/components/Module';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { buttonStyle, inputStyle } from '@/lib/formStyles';

const REGISTER_COLOR = '#16a34a';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      await register(trimmedEmail, password, displayName.trim());
      router.replace({ pathname: '/(auth)/check-email', params: { email: trimmedEmail } });
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed. Try a different email.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Module title="Register" color={REGISTER_COLOR}>
      <Text style={{ color: '#666' }}>Join or start a house</Text>

      <TextInput
        placeholder="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        style={inputStyle}
      />
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="username"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        style={inputStyle}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
        style={inputStyle}
      />

      {error ? <Text style={{ color: '#c62828' }}>{error}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting || !email || !password || !displayName}
        style={({ pressed }) => [buttonStyle(REGISTER_COLOR), pressed && { opacity: 0.8 }]}
      >
        <Text style={{ color: 'white', fontWeight: '600' }}>
          {isSubmitting ? 'Creating…' : 'Create account'}
        </Text>
      </Pressable>

      <Link href="/(auth)/login" style={{ textAlign: 'center', marginTop: 8 }}>
        Already have an account? Log in
      </Link>
    </Module>
  );
}
