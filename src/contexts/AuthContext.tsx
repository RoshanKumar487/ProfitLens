
'use client';

import type { User as FirebaseUser, AuthError } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  companyId: string | null; 
  companyName: string | null;
  country?: string;
  currencySymbol: string;
  role: 'admin';
  isSuperAdmin: boolean;
  getIdToken: () => Promise<string | null>;
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
  signUp: (email: string, password: string, displayName: string, companyInfo: SignUpCompanyInfo) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// A mock user for displaying the UI without a real backend.
const mockUser: User = {
  uid: 'mock-user-123',
  email: 'user@example.com',
  displayName: 'Demo User',
  companyId: 'mock-company-123',
  companyName: 'Demo Company Inc.',
  country: 'US',
  currencySymbol: '$',
  role: 'admin',
  isSuperAdmin: true,
  getIdToken: async () => 'mock-token',
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On initial load, set the mock user and stop loading.
  useEffect(() => {
    setUser(mockUser);
    setIsLoading(false);
  }, []);

  const authContextValue: AuthContextType = {
    user,
    isLoading,
    error: null,
    currencySymbol: user?.currencySymbol || '$',
    signUp: async () => { console.log("Sign up is disabled."); return Promise.resolve(null); },
    signIn: async () => { console.log("Sign in is disabled."); return Promise.resolve(null); },
    signOut: async () => { setUser(null); console.log("Signed out."); },
    sendPasswordReset: async () => { console.log("Password reset is disabled."); },
    getIdToken: async () => user?.getIdToken() || null,
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
