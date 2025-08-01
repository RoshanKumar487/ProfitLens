
'use server';

import { getDb } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const saltRounds = 10;
const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-key-that-is-at-least-32-chars-long');

const SignUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
});

const SignInSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export async function signUp(formData: unknown) {
  const result = SignUpSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: 'Invalid form data.', details: result.error.flatten().fieldErrors };
  }

  const { name, email, password, companyName } = result.data;
  const db = await getDb();

  try {
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (existingUser) {
      return { success: false, error: 'A user with this email already exists.' };
    }
    
    const companyResult = await db.run('INSERT INTO companies (name) VALUES (?)', companyName);
    const companyId = companyResult.lastID;

    if (!companyId) {
        return { success: false, error: 'Failed to create company.' };
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const userResult = await db.run(
      'INSERT INTO users (name, email, password, companyId, role) VALUES (?, ?, ?, ?, ?)',
      name, email, hashedPassword, companyId, 'admin' // First user is admin
    );

    const userId = userResult.lastID;

    if (!userId) {
      return { success: false, error: 'Failed to create user.' };
    }

    await createSession(userId, companyId);
    
    // Redirect after successful sign-up
    redirect('/dashboard');

  } catch (e: any) {
    if (e.digest?.startsWith('NEXT_REDIRECT')) {
        throw e;
    }
    console.error('Sign-up error:', e);
    return { success: false, error: 'An unexpected server error occurred during sign up.' };
  }
}

export async function signIn(formData: unknown) {
  const result = SignInSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: 'Invalid form data.', details: result.error.flatten().fieldErrors };
  }

  const { email, password } = result.data;
  const db = await getDb();
  
  let user;
  try {
    user = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid email or password.' };
    }
  } catch (e: any) {
      console.error('Sign-in DB error:', e);
      return { success: false, error: 'An unexpected server error occurred during sign in.' };
  }
  
  // If we reach here, credentials are valid.
  // Create session and then redirect.
  await createSession(user.id, user.companyId);
  redirect('/dashboard');
}

async function createSession(userId: number, companyId: number) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await new SignJWT({ userId, companyId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);

  cookies().set('session', session, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export async function signOut() {
    cookies().delete('session');
    redirect('/auth/signin');
}

export async function getCurrentUser() {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return null;

    try {
        const { payload } = await jwtVerify(sessionCookie, secretKey, {
            algorithms: ['HS256'],
        });
        
        if (!payload.userId) {
            return null;
        }
        
        const db = await getDb();
        const user = await db.get(`
            SELECT 
                u.id, u.name, u.email, u.role, u.isSuperAdmin,
                c.id as companyId, c.name as companyName, c.currencySymbol
            FROM users u
            JOIN companies c ON u.companyId = c.id
            WHERE u.id = ?
        `, payload.userId);

        if (!user) return null;

        return {
            uid: user.id.toString(),
            displayName: user.name,
            email: user.email,
            companyId: user.companyId,
            companyName: user.companyName,
            publicCompanyId: `CMP-${user.companyId}`,
            currencySymbol: user.currencySymbol,
            role: user.role,
            isSuperAdmin: !!user.isSuperAdmin,
        };
    } catch (e) {
        // This can happen if the token is malformed or expired
        console.error('Session verification failed:', e);
        return null;
    }
}
