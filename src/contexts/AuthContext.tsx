
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser, signOut as signOutAction } from '@/app/auth/actions';

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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
        setIsLoading(true);
        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser as User | null);
            if (!currentUser && !pathname.startsWith('/auth')) {
                router.push('/auth/signin');
            }
        } catch (error) {
            console.error("Failed to fetch current user", error);
            setUser(null);
            if (!pathname.startsWith('/auth')) {
                router.push('/auth/signin');
            }
        } finally {
            setIsLoading(false);
        }
    };
    checkUser();
  }, [pathname, router]);

  const signOut = async () => {
    await signOutAction();
    setUser(null);
  };

  const authContextValue: AuthContextType = {
    user,
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
