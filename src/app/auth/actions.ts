
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { createSession, getSession } from '@/lib/session';

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


export async function signOutAction() {
  await getSession().then(session => {
    if (session) {
      cookies().delete('session');
    }
  });
  redirect('/auth/signin');
}

export async function signIn(previousState: any, formData: FormData) {
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
        
        if (!user.companyId) {
            return { error: 'User is not associated with a company.' };
        }

        await createSession(user._id.toHexString(), user.companyId.toHexString());
        
    } catch (error) {
        console.error('Sign in error:', error);
        if (error instanceof Error && error.name === 'NEXT_REDIRECT') {
          throw error;
        }
        return { error: 'An unexpected error occurred.' };
    }
    
    redirect('/dashboard');
}

export async function signUp(previousState: any, formData: FormData) {
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
        
        if (!companyId) {
            return { error: 'Failed to create company profile.' };
        }

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
        if (error instanceof Error && error.name === 'NEXT_REDIRECT') {
          throw error;
        }
        return { error: 'An unexpected error occurred during sign-up.' };
    }
    
    redirect('/dashboard');
}
