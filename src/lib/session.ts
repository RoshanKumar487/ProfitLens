
'use server';
import 'server-only';

import { cookies } from 'next/headers';
import admin from './firebaseAdminConfig';

export async function createSession(idToken: string) {
  const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
  const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
  
  cookies().set('session', sessionCookie, {
    maxAge: expiresIn,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export async function getSession() {
  try {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) return null;
    return await admin.auth().verifySessionCookie(sessionCookie, true);
  } catch (error) {
    return null;
  }
}

export async function deleteSession() {
  cookies().delete('session');
}
