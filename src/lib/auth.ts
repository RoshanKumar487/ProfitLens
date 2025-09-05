import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const secretKey = process.env.JWT_SECRET_KEY || 'default-secret-key-that-should-be-in-env';
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // Token expires in 1 hour
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (error) {
    // Log the specific error for debugging purposes
    console.error('JWT Verification Error:', error);
    // In case of any error (token expired, invalid signature, etc.), return null
    return null;
  }
}

export async function createSession(user: any) {
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  const session = await encrypt({ user, expires });

  cookies().set('session', session, { expires, httpOnly: true });
}

export async function verifySession() {
    const cookie = cookies().get('session')?.value;
    if (!cookie) {
        return null;
    }
    const session = await decrypt(cookie);

    if (!session?.user) {
        return null;
    }
    
    // Check if the session is expired
    if (new Date(session.expires) < new Date()) {
        return null;
    }

    return session.user;
}

export async function deleteSession() {
  cookies().set('session', '', { expires: new Date(0) });
}
