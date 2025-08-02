
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { createSession, deleteSession, getSession } from '@/lib/session';

interface UserProfile {
  name: string;
  companyName: string;
}

export async function completeSignUp(profile: UserProfile) {
    const session = await getSession();
    if (!session?.uid || !session.email) {
        return { error: 'Not authenticated or missing email.' };
    }

    try {
        const { db } = await connectToDatabase();
        
        const existingUser = await db.collection('users').findOne({ uid: session.uid });
        if (existingUser) {
            return { error: 'User profile already exists.' };
        }

        const publicCompanyId = `CMP-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
        const companyResult = await db.collection('companyProfiles').insertOne({
            name: profile.companyName,
            publicId: publicCompanyId,
            currencySymbol: '$',
            createdAt: new Date(),
        });
        const companyId = companyResult.insertedId;

        await db.collection('users').insertOne({
            uid: session.uid,
            name: profile.name,
            email: session.email,
            companyId,
            role: 'admin',
            createdAt: new Date(),
        });
        
        return { success: true };

    } catch (error: any) {
        return { error: `An unexpected error occurred: ${error.message}` };
    }
}

export async function getCurrentUser() {
    const session = await getSession();
    if (!session?.uid) return null;

    try {
        const { db } = await connectToDatabase();
        
        const pipeline = [
            { $match: { uid: session.uid } },
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
                    uid: 1,
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
        
        return JSON.parse(JSON.stringify({
          ...user,
          companyId: user.companyId?.toString()
        }));

    } catch (error) {
        console.error("Failed to fetch current user:", error);
        return null;
    }
}

export async function createSessionAction(idToken: string) {
    await createSession(idToken);
}

export async function signOutAction() {
    await deleteSession();
}
