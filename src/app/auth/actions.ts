'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';

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
  
  try {
    const { db } = await connectToDatabase();
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return { success: false, error: 'A user with this email already exists.' };
    }
    
    const companyResult = await db.collection('companies').insertOne({ name: companyName, createdAt: new Date() });
    const companyId = companyResult.insertedId;

    if (!companyId) {
        return { success: false, error: 'Failed to create company.' };
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const userResult = await db.collection('users').insertOne({
      name,
      email,
      password: hashedPassword,
      companyId,
      role: 'admin', // First user is admin
      createdAt: new Date()
    });

    const userId = userResult.insertedId;

    if (!userId) {
      // In a real app, you might want to delete the company that was just created.
      return { success: false, error: 'Failed to create user.' };
    }

    await createSession(userId.toHexString(), companyId.toHexString());
    
  } catch (e: any) {
    console.error('Sign-up error:', e);
    return { success: false, error: 'An unexpected server error occurred during sign up.' };
  }
  
  redirect('/dashboard');
}

export async function signIn(formData: unknown) {
  const result = SignInSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: 'Invalid form data.', details: result.error.flatten().fieldErrors };
  }

  const { email, password } = result.data;
  let user;
  
  try {
    const { db } = await connectToDatabase();
    user = await db.collection('users').findOne({ email });
    
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
  
  await createSession(user._id.toHexString(), user.companyId.toHexString());
  redirect('/dashboard');
}

async function createSession(userId: string, companyId: string) {
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
        
        const userId = payload.userId as string;
        if (!userId) {
            return null;
        }
        
        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

        if (!user) return null;

        const company = await db.collection('companies').findOne({ _id: user.companyId });
        
        if (!company) return null;

        return {
            uid: user._id.toHexString(),
            displayName: user.name,
            email: user.email,
            companyId: company._id.toHexString(),
            companyName: company.name,
            publicCompanyId: `CMP-${company._id.toHexString().substring(0,8)}`,
            currencySymbol: company.currencySymbol || '$',
            role: user.role,
            isSuperAdmin: !!user.isSuperAdmin,
        };
    } catch (e) {
        console.error('Session verification failed:', e);
        return null;
    }
}
