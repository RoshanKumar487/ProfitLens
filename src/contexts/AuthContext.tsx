
'use client';

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/countries';

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

// Create a mock user for the application
const MOCK_USER: User = {
    uid: 'mock-user-123',
    email: 'user@example.com',
    displayName: 'Demo User',
    companyId: 'mock-company-456',
    companyName: 'InvoPilot Demo Inc.',
    publicCompanyId: 'CMP-DEMO-01',
    currencySymbol: getCurrencySymbol('US'),
    role: 'admin',
    isSuperAdmin: true,
};


interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  currencySymbol: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(MOCK_USER);
  const [isLoading, setIsLoading] = useState(false);

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
