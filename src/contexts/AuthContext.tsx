
'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

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

// Mock user data since authentication is removed
const MOCK_USER: User = {
    uid: 'mock-user-123',
    email: 'user@example.com',
    displayName: 'Demo User',
    companyId: 'mock-company-123',
    companyName: 'Demo Company Inc.',
    publicCompanyId: 'CMP-DEMO123',
    currencySymbol: '$',
    role: 'admin',
    isSuperAdmin: true,
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user] = useState<User | null>(MOCK_USER);
  const [isLoading] = useState(false);

  const signOut = async () => {
    console.log("Signing out is disabled as authentication is removed.");
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
