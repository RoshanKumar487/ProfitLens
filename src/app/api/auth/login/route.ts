import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ email });

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const company = await db.collection('companies').findOne({ _id: user.companyId });
    
    const userPayload = {
        id: user._id.toHexString(),
        email: user.email,
        displayName: user.displayName,
        companyId: user.companyId.toHexString(),
        companyName: company?.name,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin || false,
    };

    await createSession(userPayload);

    return NextResponse.json({ success: true, user: userPayload });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
