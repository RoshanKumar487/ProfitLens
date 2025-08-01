
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

const secretKey = process.env.SESSION_SECRET || 'your-fallback-secret-key';
const key = new TextEncoder().encode(secretKey);

if (!process.env.SESSION_SECRET) {
    console.warn("SESSION_SECRET is not set in .env file. Using a default, insecure key.");
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // Session expires in 1 day
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // This can happen if the token is expired or invalid
    return null;
  }
}

export async function createSession(userId: string, companyId: string) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expires in 1 day
  const session = await encrypt({ userId, companyId, expires });

  cookies().set('session', session, { expires, httpOnly: true });
}

export async function getSession() {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;
  return await decrypt(sessionCookie);
}

export async function getCurrentUser() {
    const session = await getSession();
    if (!session?.userId || !session.companyId) return null;

    try {
        const { db } = await connectToDatabase();
        
        const pipeline = [
            { $match: { _id: new (await import('mongodb')).ObjectId(session.userId) } },
            {
                $lookup: {
                    from: 'companyProfiles',
                    localField: 'companyId',
                    foreignField: '_id',
                    as: 'company'
                }
            },
            { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    uid: '$_id',
                    email: 1,
                    displayName: '$name',
                    companyId: '$company._id',
                    companyName: '$company.name',
                    publicCompanyId: '$company.publicId',
                    currencySymbol: '$company.currencySymbol',
                    role: 1,
                    isSuperAdmin: { $ifNull: ["$isSuperAdmin", false] }
                }
            }
        ];

        const users = await db.collection('users').aggregate(pipeline).toArray();
        if (users.length === 0) return null;

        const user = users[0];
        
        // Convert ObjectIDs to strings for serialization
        return JSON.parse(JSON.stringify({
          ...user,
          uid: user.uid.toString(),
          companyId: user.companyId?.toString()
        }));

    } catch (error) {
        console.error("Failed to fetch current user:", error);
        return null;
    }
}


export async function signOut() {
  cookies().set('session', '', { expires: new Date(0) });
  redirect('/auth/signin');
}

export async function signIn(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        return { error: 'Email and password are required.' };
    }

    try {
        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne({ email });

        if (!user) {
            return { error: 'Invalid email or password.' };
        }

        const passwordsMatch = await bcrypt.compare(password, user.password);

        if (!passwordsMatch) {
            return { error: 'Invalid email or password.' };
        }

        await createSession(user._id.toHexString(), user.companyId.toHexString());
        
    } catch (error) {
        console.error('Sign in error:', error);
        return { error: 'An unexpected error occurred.' };
    }

    redirect('/dashboard');
}

export async function signUp(formData: FormData) {
    const name = formData.get('name') as string;
    const companyName = formData.get('companyName') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!name || !companyName || !email || !password) {
        return { error: 'All fields are required.' };
    }

    try {
        const { db } = await connectToDatabase();

        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return { error: 'A user with this email already exists.' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the company profile first
        const publicCompanyId = `CMP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const companyResult = await db.collection('companyProfiles').insertOne({
            name: companyName,
            publicId: publicCompanyId,
            currencySymbol: '$', // Default currency
            createdAt: new Date(),
        });
        const companyId = companyResult.insertedId;

        // Create the user and associate them with the company
        const userResult = await db.collection('users').insertOne({
            name,
            email,
            password: hashedPassword,
            companyId,
            role: 'admin', // First user is the admin
            createdAt: new Date(),
        });

        await createSession(userResult.insertedId.toHexString(), companyId.toHexString());

    } catch (error) {
        console.error('Sign up error:', error);
        return { error: 'An unexpected error occurred during sign-up.' };
    }

    redirect('/dashboard');
}
