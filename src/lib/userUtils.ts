import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  email: string;
  role: 'viewer' | 'analyst' | 'commander';
  approved: boolean;
  createdAt: any;
  lastLogin: any;
}

export async function getOrCreateUserProfile(user: User): Promise<UserProfile | null> {
  if (!user) return null;

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // Update last login
    await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
    return userSnap.data() as UserProfile;
  } else {
    // Create new profile (Pending)
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || 'unknown',
      role: 'viewer',
      approved: false, // DEFAULT DENIED
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    };
    
    await setDoc(userRef, newProfile);
    return newProfile;
  }
}
