
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
  sendPasswordResetEmail, // Added for potential future use
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  companyId: string; // Added companyId
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: AuthError | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<FirebaseUser | null>;
  signIn: (email: string, password: string) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>; // Added
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to derive companyId
const getDerivedCompanyId = (uid: string): string => {
  // Consistent with Firestore rules: "fb-default-company-" + uid.slice(0, 5)
  return `fb-default-company-${uid.slice(0, 5)}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const companyId = getDerivedCompanyId(firebaseUser.uid);
        const appUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          companyId: companyId,
        };
        setUser(appUser);
        console.log(`AuthContext: User authenticated. UID: ${firebaseUser.uid}, CompanyID: ${companyId}`);
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
      const firebaseUser = userCredential.user;
      if (displayName && firebaseUser) {
        await updateProfile(firebaseUser, { displayName });
      }
      // User state will be updated by onAuthStateChanged listener
      // This ensures companyId is derived correctly after signup.
      const companyId = getDerivedCompanyId(firebaseUser.uid);
      const appUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayName || firebaseUser.displayName,
        companyId: companyId,
      };
      setUser(appUser); // Manually set user here to ensure immediate availability
      console.log('AuthContext: User signed up successfully:', firebaseUser.uid, 'CompanyId:', companyId);
      toast({ title: "Sign Up Successful", description: "Welcome!" });
      router.push('/');
      return firebaseUser;
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
      // User state will be updated by onAuthStateChanged listener
      // Setting user manually here too for robustness
      const firebaseUser = userCredential.user;
      const companyId = getDerivedCompanyId(firebaseUser.uid);
      const appUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          companyId: companyId,
      };
      setUser(appUser);
      console.log('AuthContext: User signed in successfully:', userCredential.user.uid, 'CompanyId:', companyId);
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
      // User state (setUser(null)) handled by onAuthStateChanged
      console.log('AuthContext: User signed out successfully.');
      toast({ title: "Signed Out", description: "You have been successfully signed out."});
      // router.push('/signin'); // Or your desired sign-in page. For now, let pages handle no user.
    } catch (err) {
      const authError = err as AuthError;
      console.error('AuthContext: Sign out error', authError);
      setError(authError);
      toast({ title: "Sign Out Failed", description: authError.message, variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Password Reset Email Sent", description: "Check your inbox for instructions." });
    } catch (err) {
      const authError = err as AuthError;
      console.error('AuthContext: Password reset error', authError);
      setError(authError);
      toast({ title: "Password Reset Failed", description: authError.message, variant: "destructive"});
    }
  };


  return (
    <AuthContext.Provider value={{ user, isLoading, error, signUp, signIn, signOut, sendPasswordReset }}>
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
