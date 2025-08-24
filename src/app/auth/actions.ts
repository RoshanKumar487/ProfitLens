
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth as adminAuth } from '@/lib/firebaseAdminConfig';
import { app } from '@/lib/firebaseConfig';
import { SigninSchema, SignupSchema, type SignupInput, type SigninInput } from '@/lib/schemas';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

// This function is now a mock since there's no database.
export async function getCurrentUser() {
  const session = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;
  try {
    const decodedToken = await adminAuth.verifySessionCookie(session, true);
    // Return a mock user object for consistency
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: 'Demo User',
      companyId: 'mock-company-123',
      companyName: 'Demo Company Inc.',
      publicCompanyId: 'CMP-DEMO123',
      currencySymbol: '$',
      role: 'admin' as const,
      isSuperAdmin: true,
    };
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}

export async function signInWithEmail(data: SigninInput) {
  const result = SigninSchema.safeParse(data);
  if (!result.success) {
    return { success: false, error: 'Invalid email or password format.' };
  }

  const { email, password } = result.data;
  const auth = getAuth(app);

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    cookies().set(SESSION_COOKIE_NAME, sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: true });

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
        const userCredential = await createUserWithEmailAndPassword(getAuth(app), email, password);
        const { user } = userCredential;

        // Since we don't have a database, we'll just sign the user in directly
        // and create a session for them.
        const idToken = await user.getIdToken();
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        cookies().set(SESSION_COOKIE_NAME, sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: true });

        // Redirect to dashboard, skipping the details page as it requires a DB.
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
