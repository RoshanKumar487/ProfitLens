
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
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

const MOCK_USER: UserProfile = {
  uid: 'mock-user-123',
  email: 'user@example.com',
  displayName: 'Demo User',
  companyId: 'mock-company-123',
  companyName: 'Demo Company Inc.',
  role: 'admin',
  isSuperAdmin: true,
  country: 'US',
  publicCompanyId: 'pub-mock-abc-789',
};


const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  isLoading: true,
  currencySymbol: '$',
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(MOCK_USER);
  const [isLoading, setIsLoading] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');

  useEffect(() => {
    // Auth is disabled, so we just set the mock user and currency.
    if (user) {
        setCurrencySymbol(getCurrencySymbol(user.country));
    }
    setIsLoading(false);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, firebaseUser: null, isLoading, currencySymbol }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
