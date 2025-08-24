
'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, getAuth, User as FirebaseUser } from 'firebase/auth';
import { app } from '@/lib/firebaseConfig';
import { Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/app/auth/actions';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  companyId: string; 
  companyName: string | null;
  publicCompanyId: string | null;
  currencySymbol: string;
  role: 'admin' | 'member' | 'pending' | 'rejected';
  isSuperAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  currencySymbol: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged is useful for real-time client-side updates,
    // but our primary source of truth is the session cookie verified by the server.
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
            const fullUser = await getCurrentUser();
            setUser(fullUser);
        } catch (error) {
            console.error("Failed to get current user session:", error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    });

    // Initial check in case onAuthStateChanged doesn't fire immediately
    getCurrentUser().then(fullUser => {
        setUser(fullUser);
        setIsLoading(false);
    }).catch(() => {
        setUser(null);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const authContextValue: AuthContextType = {
    user,
    isLoading,
    currencySymbol: user?.currencySymbol || '$',
  };
  
  if (isLoading) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <AuthContext.Provider value={authContextValue}>
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

