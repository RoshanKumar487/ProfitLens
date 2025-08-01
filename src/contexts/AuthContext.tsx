
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  companyId: string | null; 
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

// A mock user for displaying the UI without a real backend.
const mockUser: User = {
  uid: 'mock-user-123',
  email: 'user@example.com',
  displayName: 'Demo User',
  companyId: 'mock-company-123',
  publicCompanyId: 'MOCK-ID',
  companyName: 'Demo Company Inc.',
  currencySymbol: '$',
  role: 'admin',
  isSuperAdmin: true,
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setUser(mockUser);
    setIsLoading(false);
  }, []);

  const authContextValue: AuthContextType = {
    user,
    isLoading,
    currencySymbol: user?.currencySymbol || '$',
    signOut: async () => {
      setUser(null);
      router.push('/');
      console.log("Signed out.");
    },
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
