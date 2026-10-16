import { LanguageModuleCard } from '@/components/LanguageModuleCard';

// Same "/language" path as (app)/language.tsx - only one is registered at a time, per the
// active Stack.Protected branch (same technique as (auth)/app.tsx), so a visitor can switch
// language before signing in.
export default function AuthLanguageScreen() {
  return <LanguageModuleCard />;
}
