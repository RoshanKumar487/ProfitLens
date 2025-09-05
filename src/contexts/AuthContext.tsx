
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrencySymbol } from '@/lib/countries';
import { getSessionAction } from '@/app/auth/actions';
import { Loader2 } from 'lucide-react';

export interface UserProfile {
  id: string;
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
  isLoading: boolean;
  currencySymbol: string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  currencySymbol: '$',
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const sessionUser = await getSessionAction();
        if (sessionUser) {
          setUser(sessionUser);
          setCurrencySymbol(getCurrencySymbol(sessionUser.country));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch session:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, currencySymbol }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
