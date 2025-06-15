
'use client';

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '@/lib/firebaseConfig';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: AuthError | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<FirebaseUser | null>;
  signIn: (email: string, password: string) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const appUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        };
        setUser(appUser);
        console.log(`AuthContext: User authenticated. UID: ${firebaseUser.uid}`);
      } else {
        setUser(null);
        console.log('AuthContext: No user signed in.');
      }
      setIsLoading(false);
    }, (authError) => {
        console.error("AuthContext: Auth state change error", authError);
        setError(authError);
        setUser(null);
        setIsLoading(false);
        toast({ title: "Authentication Error", description: authError.message, variant: "destructive"});
    });

    return () => unsubscribe();
  }, [toast]);

  const signUp = async (email: string, password: string, displayName?: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
        setUser(prevUser => prevUser ? {...prevUser, displayName } : { uid: userCredential.user.uid, email: userCredential.user.email, displayName });
      }
      console.log('AuthContext: User signed up successfully:', userCredential.user.uid);
      toast({ title: "Sign Up Successful", description: "Welcome!" });
      router.push('/');
      return userCredential.user;
    } catch (err) {
      const authError = err as AuthError;
      console.error('AuthContext: Sign up error', authError);
      setError(authError);
      toast({ title: "Sign Up Failed", description: authError.message, variant: "destructive"});
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('AuthContext: User signed in successfully:', userCredential.user.uid);
      toast({ title: "Sign In Successful", description: "Welcome back!"});
      router.push('/');
      return userCredential.user;
    } catch (err) {
      const authError = err as AuthError;
      console.error('AuthContext: Sign in error', authError);
      setError(authError);
      toast({ title: "Sign In Failed", description: authError.message, variant: "destructive"});
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      console.log('AuthContext: User signed out successfully.');
      setUser(null);
      toast({ title: "Signed Out", description: "You have been successfully signed out."});
      // router.push('/signin'); // Or your desired sign-in page
    } catch (err) {
      const authError = err as AuthError;
      console.error('AuthContext: Sign out error', authError);
      setError(authError);
      toast({ title: "Sign Out Failed", description: authError.message, variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
