'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { UserProfile, getOrCreateUserProfile } from '@/lib/userUtils';
import { ShieldCheck } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch Firestore Profile
        try {
          const userProfile = await getOrCreateUserProfile(currentUser);
          setProfile(userProfile);
        } catch (e) {
          console.error("Profile Fetch Error", e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Auth Error", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout }}>
      {loading ? (
        <div className="h-screen w-screen bg-background flex items-center justify-center flex-col gap-4">
           <div className="relative">
             <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-20 animate-pulse"></div>
             <ShieldCheck className="w-12 h-12 text-primary animate-pulse relative z-10" />
           </div>
           <div className="text-primary font-mono text-xs tracking-[0.3em] animate-pulse">
             SENTINEL PROTOCOL INITIALIZING...
           </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);