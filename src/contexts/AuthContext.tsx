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
  sendPasswordResetEmail,
} from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation'; // Import usePathname
import { useToast } from '@/hooks/use-toast';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  companyId: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: AuthError | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<FirebaseUser | null>;
  signIn: (email: string, password: string) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDerivedCompanyId = (uid: string): string => {
  return `fb-default-company-${uid.slice(0, 5)}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const router = useRouter();
  const pathname = usePathname(); // Get current pathname
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
        // If user is on an auth page after successful login/signup, redirect to dashboard
        const authPages = ['/auth/signin', '/auth/signup'];
        if (authPages.includes(pathname)) {
          router.push('/');
        }
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
  }, [toast, router, pathname]); // pathname is included to re-evaluate if user lands on auth page while already logged in

  // This useEffect handles redirection for unauthenticated users
  useEffect(() => {
    const publicPaths = ['/auth/signin', '/auth/signup']; // Define public paths
    const isAuthPage = publicPaths.includes(pathname);

    // Only redirect if:
    // 1. Auth state is determined (isLoading is false)
    // 2. There is no user
    // 3. The current page is NOT one of the public authentication pages
    if (!isLoading && !user && !isAuthPage) {
      console.log(`AuthContext: Redirecting to /auth/signin from ${pathname}`);
      router.push('/auth/signin');
    }
  }, [user, isLoading, pathname, router]);


  const signUp = async (email: string, password: string, displayName?: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      if (displayName && firebaseUser) {
        await updateProfile(firebaseUser, { displayName });
      }
      // User state will be updated by onAuthStateChanged, which also handles initial redirect.
      const companyId = getDerivedCompanyId(firebaseUser.uid);
      console.log('AuthContext: User signed up successfully:', firebaseUser.uid, 'CompanyId:', companyId);
      toast({ title: "Sign Up Successful", description: "Welcome!" });
      // router.push('/'); // Let onAuthStateChanged handle redirect from auth pages
      return firebaseUser;
    } catch (err) {
      const authError = err as AuthError;
      console.error('AuthContext: Sign up error', authError);
      setError(authError); // Set error state
      toast({ title: "Sign Up Failed", description: authError.message, variant: "destructive"});
      setIsLoading(false); // Ensure loading is false on error
      return null;
    } 
    // setIsLoading(false) is handled by onAuthStateChanged after state update
  };

  const signIn = async (email: string, password: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // User state will be updated by onAuthStateChanged.
      const companyId = getDerivedCompanyId(userCredential.user.uid);
      console.log('AuthContext: User signed in successfully:', userCredential.user.uid, 'CompanyId:', companyId);
      toast({ title: "Sign In Successful", description: "Welcome back!"});
      // router.push('/'); // Let onAuthStateChanged handle redirect from auth pages
      return userCredential.user;
    } catch (err) {
      const authError = err as AuthError;
      console.error('AuthContext: Sign in error', authError);
      setError(authError); // Set error state
      toast({ title: "Sign In Failed", description: authError.message, variant: "destructive"});
      setIsLoading(false); // Ensure loading is false on error
      return null;
    }
    // setIsLoading(false) is handled by onAuthStateChanged
  };

  const signOut = async (): Promise<void> => {
    // setIsLoading(true); // Not strictly necessary to set loading true here, as onAuthStateChanged will fire
    setError(null);
    try {
      await firebaseSignOut(auth);
      // User state (setUser(null)) and isLoading(false) handled by onAuthStateChanged
      console.log('AuthContext: User signed out successfully.');
      toast({ title: "Signed Out", description: "You have been successfully signed out."});
      // router.push('/auth/signin'); // Redirect is handled by the second useEffect
    } catch (err) {
      const authError = err as AuthError;
      console.error('AuthContext: Sign out error', authError);
      setError(authError);
      toast({ title: "Sign Out Failed", description: authError.message, variant: "destructive"});
      // setIsLoading(false); // Handled by onAuthStateChanged if it fires, or ensure it's set
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
