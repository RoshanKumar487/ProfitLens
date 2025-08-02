
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, signOut as firebaseSignOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebaseConfig';
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
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  currencySymbol: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const appUser = await getCurrentUser();
          setUser(appUser as User | null);
           if (!appUser && !pathname.startsWith('/auth/signup-details')) {
             // This case handles when Firebase user exists but app user profile is not complete
             router.push('/auth/signup-details');
           }
        } catch (error) {
           console.error("Failed to fetch app user data", error);
           setUser(null);
           router.push('/auth/signin');
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        if (!pathname.startsWith('/auth')) {
          router.push('/auth/signin');
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
    router.push('/auth/signin');
  };

  const authContextValue: AuthContextType = {
    user,
    firebaseUser,
    isLoading,
    currencySymbol: user?.currencySymbol || '$',
    signOut,
  };

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
