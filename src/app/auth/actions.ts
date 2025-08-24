
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/mongodb';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth as adminAuth } from '@/lib/firebaseAdminConfig';
import { app } from '@/lib/firebaseConfig'; // Client SDK
import { SigninSchema, SignupSchema, CompanyDetailsSchema, type SignupInput, type SigninInput, type CompanyDetailsInput } from '@/lib/schemas';
import { SESSION_COOKIE_NAME } from '@/lib/constants';

export async function getCurrentUser() {
  const session = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;
  try {
    const decodedToken = await adminAuth.verifySessionCookie(session, true);
    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ uid: decodedToken.uid });
    if (!user) return null;

    const company = await db.collection('companyProfiles').findOne({ _id: user.companyId });
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      companyId: user.companyId.toHexString(),
      companyName: company?.name,
      publicCompanyId: company?.publicId,
      currencySymbol: company?.currencySymbol || '$',
      role: user.role,
      isSuperAdmin: user.isSuperAdmin || false,
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
        const { db } = await connectToDatabase();
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return { success: false, error: "An account with this email already exists." };
        }

        const userCredential = await createUserWithEmailAndPassword(getAuth(app), email, password);
        const { user } = userCredential;

        // Store temp user ID to link details on the next step
        cookies().set('temp-signup-uid', user.uid, { maxAge: 60 * 10, httpOnly: true, secure: true });
        
        return { success: true, uid: user.uid };
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
        return { success: false, error: "Invalid company details.", fieldErrors: result.error.flatten().fieldErrors };
    }

    const uid = cookies().get('temp-signup-uid')?.value;
    if (!uid) {
        return { success: false, error: "Session expired. Please sign up again." };
    }
    
    const { companyName, userName, country } = result.data;

    try {
        const { db } = await connectToDatabase();
        
        const userRecord = await adminAuth.getUser(uid);

        const newCompanyProfile = {
            name: companyName,
            adminUid: uid,
            createdAt: new Date(),
            currencySymbol: '$',
            country: country,
            publicId: `CMP-${Date.now().toString().slice(-6)}`,
        };
        const companyResult = await db.collection('companyProfiles').insertOne(newCompanyProfile);

        await db.collection('users').insertOne({
            uid,
            email: userRecord.email,
            displayName: userName,
            companyId: companyResult.insertedId,
            role: 'admin',
            createdAt: new Date(),
        });
        
        await adminAuth.updateUser(uid, { displayName: userName });

        cookies().delete('temp-signup-uid');

        const idToken = await getAuth(app).currentUser?.getIdToken(true) || (await adminAuth.createCustomToken(uid));
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
        cookies().set(SESSION_COOKIE_NAME, sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: true });

        return { success: true };
    } catch (error) {
        console.error("Error completing sign up:", error);
        return { success: false, error: "An unexpected error occurred." };
    }
}


export async function signOut() {
  cookies().delete(SESSION_COOKIE_NAME);
  redirect('/auth/signin');
}
