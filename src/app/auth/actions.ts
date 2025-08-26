
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebaseConfig';
import { SigninSchema, SignupSchema, CompanyDetailsSchema, type SignupInput, type SigninInput, type CompanyDetailsInput } from '@/lib/schemas';
import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { getCurrencySymbol } from '@/lib/countries';
import { adminAuth, db } from '@/lib/firebaseAdmin';

export async function getCurrentUser() {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME);
  if (!sessionCookie) return null;

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true);
    const userDocRef = db.collection('users').doc(decodedToken.uid);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      return null;
    }
    const userData = userDoc.data();
    if (!userData) {
      return null;
    }

    const companyDocRef = db.collection('companies').doc(userData.companyId);
    const companyDoc = await companyDocRef.get();
    if (!companyDoc.exists) {
      return null;
    }
    const companyData = companyDoc.data();
     if (!companyData) {
      return null;
    }

    return {
      uid: userDoc.id,
      email: userData.email,
      displayName: userData.name,
      companyId: companyDoc.id,
      companyName: companyData.name,
      publicCompanyId: companyData.publicId,
      currencySymbol: getCurrencySymbol(companyData.country),
      role: userData.role,
      isSuperAdmin: userData.isSuperAdmin || false,
    };
  } catch (error) {
    console.error('Error verifying session cookie:', error);
    cookies().delete(SESSION_COOKIE_NAME);
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
    cookies().set(SESSION_COOKIE_NAME, sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production' });

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
    const auth = getAuth(app);
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const companyRef = db.collection('companies').doc();
        await companyRef.set({
            name: 'My New Company', // Temporary name
            ownerId: user.uid,
            createdAt: new Date(),
            publicId: `CMP-${Date.now().toString().slice(-6)}`,
        });

        const userRef = db.collection('users').doc(user.uid);
        await userRef.set({
            email: user.email,
            companyId: companyRef.id,
            role: 'admin', // First user is always an admin
            createdAt: new Date(),
        });
        
        const idToken = await user.getIdToken();
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        cookies().set(SESSION_COOKIE_NAME, sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production' });

        return { success: true, redirect: '/auth/signup-details' };

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            return { success: false, error: "An account with this email already exists." };
        }
        console.error('Sign-up error:', error);
        return { success: false, error: "Could not create account. Please try again." };
    }
}

export async function completeSignUp(data: CompanyDetailsInput) {
    const result = CompanyDetailsSchema.safeParse(data);
    if (!result.success) {
        return { success: false, error: "Invalid form data." };
    }
    
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "User not found. Please sign in again." };
    }

    try {
        const userRef = db.collection('users').doc(user.uid);
        await userRef.update({ name: result.data.userName });

        const companyRef = db.collection('companies').doc(user.companyId);
        await companyRef.update({
            name: result.data.companyName,
            country: result.data.country
        });

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error("Error completing sign up:", error);
        return { success: false, error: "Could not save details. Please try again." };
    }
}


export async function signOut() {
  cookies().delete(SESSION_COOKIE_NAME);
  revalidatePath('/', 'layout');
  redirect('/auth/signin');
}
