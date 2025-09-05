import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password, displayName, companyName } = await request.json();

    if (!email || !password || !displayName || !companyName) {
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const existingUser = await db.collection('users').findOne({ email });

    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const companyResult = await db.collection('companies').insertOne({
        name: companyName,
        createdAt: new Date(),
    });
    const companyId = companyResult.insertedId;

    const userResult = await db.collection('users').insertOne({
      email,
      password: hashedPassword,
      displayName,
      companyId,
      role: 'admin', // First user is always admin
      createdAt: new Date(),
    });
    
    await db.collection('companies').updateOne(
        { _id: companyId },
        { $set: { ownerId: userResult.insertedId } }
    );

    const userPayload = {
      id: userResult.insertedId.toHexString(),
      email,
      displayName,
      companyId: companyId.toHexString(),
      companyName,
      role: 'admin',
    };

    await createSession(userPayload);

    return NextResponse.json({ success: true, user: userPayload }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
