
'use client';

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebaseConfig';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getCurrencySymbol } from '@/lib/countries';
import { uploadFileToStorage } from '@/lib/firebaseStorageUtils';


type UserRole = 'admin' | 'member' | 'pending' | 'rejected';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  companyId: string | null; 
  companyName: string | null;
  country?: string;
  currencySymbol: string;
  role: UserRole;
  isSuperAdmin: boolean;
  getIdToken: () => Promise<string>;
}

interface SignUpCompanyInfo {
  id?: string; 
  name: string;
  address: string;
  city: string;
  stateOrProvince: string;
  country: string;
  signatureFile?: File | null;
  stampFile?: File | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: AuthError | null;
  currencySymbol: string;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    companyInfo: SignUpCompanyInfo
  ) => Promise<{ user: FirebaseUser | null; status: 'approved' | 'pending' }>;
  signIn: (email: string, password: string) => Promise<FirebaseUser | null>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const setCookie = (name: string, value: string, days: number) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  if (typeof window !== 'undefined') {
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
  }
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        const idToken = await firebaseUser.getIdToken();
        setCookie('firebaseIdToken', idToken, 1);

        const isSuperAdmin = firebaseUser.email === 'roshankumar70975@gmail.com';
        
        // A super admin might not have a user document, so we allow them to proceed.
        if (userDocSnap.exists() || isSuperAdmin) {
          const userData = userDocSnap.data() || {};
          const companyId = userData.companyId || null;
          
          const userRole: UserRole = isSuperAdmin ? 'admin' : userData.role || 'pending';

          let userCountry: string | undefined = undefined;
          let companyName: string | null = null;
          if (companyId) {
            try {
              const companyDocRef = doc(db, 'companyProfiles', companyId);
              const companyDocSnap = await getDoc(companyDocRef);
              if (companyDocSnap.exists()) {
                userCountry = companyDocSnap.data()?.country;
                companyName = companyDocSnap.data()?.name;
              }
            } catch (e) {
              console.error("AuthContext: Could not fetch company profile for currency.", e);
            }
          }
          const currencySymbol = getCurrencySymbol(userCountry);
          
          const appUser: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            companyId: companyId,
            companyName: companyName,
            country: userCountry,
            currencySymbol: currencySymbol,
            role: userRole,
            isSuperAdmin,
            getIdToken: () => firebaseUser.getIdToken(),
          };
          setUser(appUser);
          
          console.log(`AuthContext: User authenticated. UID: ${firebaseUser.uid}, Role: ${appUser.role}, SuperAdmin: ${appUser.isSuperAdmin}`);
          
          const authPages = ['/auth/signin', '/auth/signup', '/auth/forgot-password'];
          if (authPages.includes(pathname) || pathname === '/') {
            router.push('/dashboard');
          }
        } else {
          setUser(null);
          setCookie('firebaseIdToken', '', -1);
          console.log('AuthContext: Firebase user exists, but no user document found in Firestore. Possibly pending approval.');
        }
      } else {
        setUser(null);
        setCookie('firebaseIdToken', '', -1);
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
    const publicPaths = ['/auth/signin', '/auth/signup', '/auth/forgot-password'];
    const isAuthPage = publicPaths.some(path => pathname.startsWith(path));

    if (!isLoading && !user && !isAuthPage) {
      console.log(`AuthContext: Redirecting to /auth/signin from ${pathname}`);
      router.push('/auth/signin');
    }
  }, [user, isLoading, pathname, router]);

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    companyInfo: SignUpCompanyInfo
  ): Promise<{ user: FirebaseUser | null; status: 'approved' | 'pending' }> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      await updateProfile(firebaseUser, { displayName });

      if (companyInfo.id) { 
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(userDocRef, {
          uid: firebaseUser.uid, email: firebaseUser.email, displayName,
          companyId: companyInfo.id, role: 'pending', createdAt: serverTimestamp(),
        });

        await addDoc(collection(db, 'accessRequests'), {
          userId: firebaseUser.uid, userName: displayName, userEmail: email,
          companyId: companyInfo.id, companyName: companyInfo.name, status: 'pending',
          createdAt: serverTimestamp(),
        });
        
        console.log('AuthContext: User requested to join company:', companyInfo.id);
        await firebaseSignOut(auth);
        return { user: firebaseUser, status: 'pending' };
      } else { 
        const newCompanyDocRef = doc(collection(db, 'companyProfiles'));
        const companyId = newCompanyDocRef.id;

        let signatureUrl = '';
        let signatureStoragePath = '';
        if (companyInfo.signatureFile) {
            const path = `companyProfiles/${companyId}/signature.${companyInfo.signatureFile.name.split('.').pop()}`;
            signatureUrl = await uploadFileToStorage(companyInfo.signatureFile, path);
            signatureStoragePath = path;
        }

        let stampUrl = '';
        let stampStoragePath = '';
        if (companyInfo.stampFile) {
            const path = `companyProfiles/${companyId}/stamp.${companyInfo.stampFile.name.split('.').pop()}`;
            stampUrl = await uploadFileToStorage(companyInfo.stampFile, path);
            stampStoragePath = path;
        }
        
        await setDoc(newCompanyDocRef, {
          name: companyInfo.name,
          address: companyInfo.address,
          city: companyInfo.city,
          state: companyInfo.stateOrProvince,
          country: companyInfo.country,
          gstin: '', phone: '', email: firebaseUser.email || '', website: '',
          adminUserId: firebaseUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          signatureUrl,
          signatureStoragePath,
          stampUrl,
          stampStoragePath,
        });
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(userDocRef, {
          uid: firebaseUser.uid, email: firebaseUser.email, displayName,
          companyId: newCompanyDocRef.id, role: 'admin', createdAt: serverTimestamp(),
        });
        
        console.log('AuthContext: New company created by admin:', firebaseUser.uid, 'CompanyId:', newCompanyDocRef.id);
        toast({ title: "Sign Up Successful", description: "Welcome! Your company and admin account have been created." });
        return { user: firebaseUser, status: 'approved' };
      }
    } catch (err) {
      const caughtError = err as AuthError;
      setAuthError(caughtError);
      toast({ title: "Sign Up Failed", description: caughtError.message, variant: "destructive"});
      setIsLoading(false);
      return { user: null, status: 'approved' };
    }
  };

  const signIn = async (email: string, password: string): Promise<FirebaseUser | null> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const isSuperAdmin = userCredential.user.email === 'roshankumar70975@gmail.com';

      if (!isSuperAdmin) {
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists() || userDocSnap.data().role === 'pending' || userDocSnap.data().role === 'rejected') {
          const role = userDocSnap.exists() ? userDocSnap.data().role : 'unknown';
          let message = "Your account is not yet active. Please wait for admin approval.";
          if (role === 'rejected') {
              message = "Your request to join the company was rejected.";
          } else if (role === 'unknown') {
              message = "Your user profile could not be found. Please sign up first."
          }
          await firebaseSignOut(auth);
          toast({ title: "Sign In Failed", description: message, variant: "destructive"});
          setIsLoading(false);
          return null;
        }
      }

      console.log('AuthContext: User signed in successfully:', userCredential.user.uid);
      toast({ title: "Sign In Successful", description: "Welcome back!"});
      return userCredential.user;
    } catch (err) {
      const caughtError = err as AuthError;
      setAuthError(caughtError);

      let errorMessage = caughtError.message;
      if (caughtError.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid credentials. Please check your email and password, or sign up if you are a new user.';
      }
      
      toast({ title: "Sign In Failed", description: errorMessage, variant: "destructive"});
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
      setAuthError(caughtError);
      toast({ title: "Sign Out Failed", description: caughtError.message, variant: "destructive"});
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const caughtError = err as AuthError;
      setAuthError(caughtError);
      throw caughtError;
    }
  };

  const currencySymbol = user?.currencySymbol || '$';

  return (
    <AuthContext.Provider value={{ user, isLoading, error: authError, currencySymbol, signUp, signIn, signOut, sendPasswordReset }}>
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
