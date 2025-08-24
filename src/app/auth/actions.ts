
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebaseConfig';
import { SigninSchema, SignupSchema, type SignupInput, type SigninInput } from '@/lib/schemas';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

// This function now returns a mock user as there is no backend.
export async function getCurrentUser() {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME);
  if (!sessionCookie) return null;

  // Since there is no admin SDK, we'll return a mock user object
  // for any valid session cookie. In a real app, you would verify this.
  return {
    uid: 'mock-user-uid',
    email: 'user@example.com',
    displayName: 'Demo User',
    companyId: 'mock-company-123',
    companyName: 'Demo Company Inc.',
    publicCompanyId: 'CMP-DEMO123',
    currencySymbol: '$',
    role: 'admin' as const,
    isSuperAdmin: true,
  };
}

export async function signInWithEmail(data: SigninInput) {
  const result = SigninSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: 'Invalid email or password format.' };
  }

  const { email, password } = result.data;
  const auth = getAuth(app);

  try {
    // We sign in just to check if the user exists in Firebase Auth.
    await signInWithEmailAndPassword(auth, email, password);

    // In a real app, you'd create a session cookie with the admin SDK.
    // Here, we just set a simple cookie to simulate a session.
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    cookies().set(SESSION_COOKIE_NAME, 'mock-session-cookie', { maxAge: expiresIn, httpOnly: true, secure: true });

    return { success: true };
  } catch (error: any) {
    console.error('Sign-in failed:', error.code);
    return { success: false, error: 'Invalid email or password.' };
  }
}

export async function signUpWithEmail(data: SignupInput) {
    const result = SignupSchema.safeParse(data);
    if (!result.success) {
        return { success: false, error: "Invalid form data.", fieldErrors: result.error.flatten().fieldErrors };
    }
    const { email, password } = result.data;
    
    try {
        await createUserWithEmailAndPassword(getAuth(app), email, password);

        // Directly sign the user in by setting the mock session cookie.
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        cookies().set(SESSION_COOKIE_NAME, 'mock-session-cookie', { maxAge: expiresIn, httpOnly: true, secure: true });

        // Redirect to dashboard.
        return { success: true, redirect: '/dashboard' };
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            return { success: false, error: "An account with this email already exists." };
        }
        console.error('Sign-up error:', error);
        return { success: false, error: "Could not create account. Please try again." };
    }
}


export async function signOut() {
  cookies().delete(SESSION_COOKIE_NAME);
  revalidatePath('/', 'layout');
  redirect('/auth/signin');
}
