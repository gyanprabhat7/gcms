'use client';

import { useAuth, AuthProvider } from './AuthProvider';
import LoginPage from './LoginPage';
import AccessDenied from './AccessDenied';

interface Props {
  children: React.ReactNode;
}

const AuthContent = ({ children }: Props) => {
  const { user, profile, loading } = useAuth();

  if (loading) return null; // Provider handles loading spinner

  // 1. Not Logged In -> Login Screen
  if (!user) return <LoginPage />;

  // 2. Logged In BUT Not Approved -> Access Denied (Holding Cell)
  // We check if profile exists (it should if user is logged in) and if approved is false
  if (profile && !profile.approved) {
    return <AccessDenied />;
  }

  // 3. Approved -> Dashboard
  return <>{children}</>;
};

export default function AuthWrapper({ children }: Props) {
  return (
    <AuthProvider>
      <AuthContent>{children}</AuthContent>
    </AuthProvider>
  );
}
