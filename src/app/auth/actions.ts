
'use server';

import { redirect } from 'next/navigation';

// Mock user data for a seamless development experience without a real login.
const mockUser = {
  uid: 'mock-user-123',
  displayName: 'Demo User',
  email: 'user@example.com',
  companyId: 'mock-company-123',
  companyName: 'Demo Company Inc.',
  publicCompanyId: 'CMP-mock-123',
  currencySymbol: '$',
  role: 'admin' as const, // Grant admin rights for full access in demo
  isSuperAdmin: true, // Grant super admin for access to all features
};

export async function getCurrentUser() {
  console.log("Serving mock user from Auth actions.");
  return mockUser;
}

export async function signOut() {
    // In a real app, this would clear the session.
    // For the mock setup, we'll just redirect to a "logged out" state.
    console.log("Mock sign out called.");
    redirect('/auth/signin');
}
