
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrencySymbol } from '@/lib/countries';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  companyId: string | null;
  companyName: string | null;
  role: 'admin' | 'member' | 'pending' | null;
  isSuperAdmin?: boolean;
  country?: string;
  publicCompanyId?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  currencySymbol: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  isLoading: true,
  currencySymbol: '$',
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const idTokenResult = await fbUser.getIdTokenResult(true);
          const claims = idTokenResult.claims;
          
          let companyData: any = { name: null };
          if (claims.companyId) {
            const companyDoc = await getDoc(doc(db, 'companies', claims.companyId));
            if (companyDoc.exists()) {
              companyData = companyDoc.data();
            }
          }

          setUser({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            companyId: claims.companyId || null,
            companyName: companyData?.name || null,
            role: claims.role || 'pending',
            isSuperAdmin: claims.isSuperAdmin || false,
            country: companyData?.country || 'US',
            publicCompanyId: companyData?.publicId || null,
          });

          setCurrencySymbol(getCurrencySymbol(companyData?.country));

        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, firebaseUser, isLoading, currencySymbol }}>
      {isLoading ? (
        <div className="flex h-screen w-screen items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
