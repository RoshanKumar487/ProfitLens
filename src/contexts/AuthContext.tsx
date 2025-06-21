'use client';

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebaseConfig'; // Import db
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'; // Import Firestore functions
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getCurrencySymbol } from '@/lib/countries';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  companyId: string;
  country?: string; // Add country
  currencySymbol: string; // Add currency symbol
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: AuthError | null;
  signUp: (
    email: string,
    password: string,
    displayName: string, // User's full name
    companyName: string,
    companyAddress: string,
    city: string,
    stateOrProvince: string,
    country: string, // Add country
  ) => Promise<FirebaseUser | null>;
  signIn: (email: string, password: string) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getDerivedCompanyId = (uid: string): string => {
  return `fb-default-company-${uid.slice(0, 10)}`; // Increased length for more uniqueness
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null); // Renamed to avoid conflict with JS Error
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const companyId = getDerivedCompanyId(firebaseUser.uid);
        
        // Fetch company profile to get country and determine currency
        let userCountry: string | undefined = undefined;
        try {
          const companyDocRef = doc(db, 'companyProfiles', companyId);
          const companyDocSnap = await getDoc(companyDocRef);
          if (companyDocSnap.exists()) {
            userCountry = companyDocSnap.data()?.country;
          }
        } catch (e) {
            console.error("AuthContext: Could not fetch company profile for currency.", e);
        }

        const currencySymbol = getCurrencySymbol(userCountry);

        const appUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          companyId: companyId,
          country: userCountry,
          currencySymbol: currencySymbol,
        };
        setUser(appUser);
        console.log(`AuthContext: User authenticated. UID: ${firebaseUser.uid}, CompanyID: ${companyId}, Currency: ${currencySymbol}`);
        const authPages = ['/auth/signin', '/auth/signup'];
        if (authPages.includes(pathname)) {
          router.push('/');
        }
      } else {
        setUser(null);
        console.log('AuthContext: No user signed in.');
      }
      setIsLoading(false);
    }, (error) => {
        console.error("AuthContext: Auth state change error", error);
        setAuthError(error as AuthError);
        setUser(null);
        setIsLoading(false);
        toast({ title: "Authentication Error", description: (error as AuthError).message, variant: "destructive"});
    });

    return () => unsubscribe();
  }, [toast, router, pathname]);

  useEffect(() => {
    const publicPaths = ['/auth/signin', '/auth/signup'];
    const isAuthPage = publicPaths.includes(pathname);

    if (!isLoading && !user && !isAuthPage) {
      console.log(`AuthContext: Redirecting to /auth/signin from ${pathname}`);
      router.push('/auth/signin');
    }
  }, [user, isLoading, pathname, router]);

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    companyName: string,
    companyAddress: string,
    city: string,
    stateOrProvince: string,
    country: string
  ): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Update Firebase Auth user profile with displayName (Full Name)
      if (displayName && firebaseUser) {
        await updateProfile(firebaseUser, { displayName });
      }

      // Create company profile in Firestore
      const companyId = getDerivedCompanyId(firebaseUser.uid);
      const companyProfileData = {
        name: companyName,
        address: companyAddress,
        city: city,
        state: stateOrProvince,
        country: country, // Save country
        gstin: '', // Initialize empty
        phone: '', // Initialize empty
        email: firebaseUser.email || '', // Pre-fill with user's email
        website: '', // Initialize empty
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const companyDocRef = doc(db, 'companyProfiles', companyId);
      await setDoc(companyDocRef, companyProfileData);
      
      console.log('AuthContext: User signed up & company profile created:', firebaseUser.uid, 'CompanyId:', companyId);
      toast({ title: "Sign Up Successful", description: "Welcome! Your company profile has been initiated." });
      // User state will be updated by onAuthStateChanged, which also handles initial redirect.
      return firebaseUser;
    } catch (err) {
      const caughtError = err as AuthError;
      console.error('AuthContext: Sign up error', caughtError);
      setAuthError(caughtError);
      toast({ title: "Sign Up Failed", description: caughtError.message, variant: "destructive"});
      setIsLoading(false);
      return null;
    }
  };

  const signIn = async (email: string, password: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const companyId = getDerivedCompanyId(userCredential.user.uid);
      console.log('AuthContext: User signed in successfully:', userCredential.user.uid, 'CompanyId:', companyId);
      toast({ title: "Sign In Successful", description: "Welcome back!"});
      return userCredential.user;
    } catch (err) {
      const caughtError = err as AuthError;
      console.error('AuthContext: Sign in error', caughtError);
      setAuthError(caughtError);
      toast({ title: "Sign In Failed", description: caughtError.message, variant: "destructive"});
      setIsLoading(false);
      return null;
    }
  };

  const signOut = async (): Promise<void> => {
    setAuthError(null);
    try {
      await firebaseSignOut(auth);
      console.log('AuthContext: User signed out successfully.');
      toast({ title: "Signed Out", description: "You have been successfully signed out."});
    } catch (err) {
      const caughtError = err as AuthError;
      console.error('AuthContext: Sign out error', caughtError);
      setAuthError(caughtError);
      toast({ title: "Sign Out Failed", description: caughtError.message, variant: "destructive"});
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Password Reset Email Sent", description: "Check your inbox for instructions." });
    } catch (err) {
      const caughtError = err as AuthError;
      console.error('AuthContext: Password reset error', caughtError);
      setAuthError(caughtError);
      toast({ title: "Password Reset Failed", description: caughtError.message, variant: "destructive"});
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error: authError, signUp, signIn, signOut, sendPasswordReset }}>
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