
'use server';

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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

export async function signOut() {
  cookies().set('session', '', { expires: new Date(0) });
}
