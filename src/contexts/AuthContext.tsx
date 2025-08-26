
'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { app } from '@/lib/firebaseConfig';
import { Loader2 } from 'lucide-react';
import { getCurrentUser } from '@/app/auth/actions';
import { usePathname, useRouter } from 'next/navigation';

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
  const pathname = usePathname();
  const router = useRouter();

  const syncUser = async () => {
    try {
        const fullUser = await getCurrentUser();
        setUser(fullUser);
    } catch (error) {
        console.error("Failed to sync user session:", error);
        setUser(null);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    syncUser();
    // This effect should re-run when navigation happens to keep the user state fresh,
    // especially after actions like sign-in/sign-up which use router.refresh().
  }, [pathname]);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        // onAuthStateChanged is useful for client-side events like token refresh.
        // We re-sync with our server-side session to get the full user profile.
        await syncUser();
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
