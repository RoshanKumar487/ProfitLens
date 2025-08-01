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

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const { lastID } = await db.run(
      'INSERT INTO users (name, email, password, companyName) VALUES (?, ?, ?, ?)',
      name, email, hashedPassword, companyName
    );

    if (lastID) {
      await createSession(lastID);
      return { success: true };
    } else {
      return { success: false, error: 'Failed to create user.' };
    }
  } catch (e: any) {
    return { success: false, error: e.message || 'An unexpected error occurred.' };
  }
}

export async function signIn(formData: unknown) {
  const result = SignInSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: 'Invalid form data.', details: result.error.flatten().fieldErrors };
  }

  const { email, password } = result.data;
  const db = await getDb();

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid email or password.' };
    }

    await createSession(user.id);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'An unexpected error occurred.' };
  }
}

async function createSession(userId: number) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await new SignJWT({ userId })
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
        
        const db = await getDb();
        const user = await db.get('SELECT id, name, email, companyName, currencySymbol, role, isSuperAdmin FROM users WHERE id = ?', payload.userId);

        if (!user) return null;

        // Adapt to the structure expected by AuthContext
        return {
            uid: user.id.toString(),
            displayName: user.name,
            email: user.email,
            companyId: user.id.toString(), // Using user ID as company ID for simplicity
            companyName: user.companyName,
            publicCompanyId: `CMP-${user.id}`,
            currencySymbol: user.currencySymbol,
            role: user.role,
            isSuperAdmin: !!user.isSuperAdmin,
        };
    } catch (e) {
        console.error('Session verification failed:', e);
        return null;
    }
}
