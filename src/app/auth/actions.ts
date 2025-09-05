'use server';

import { redirect } from 'next/navigation';
import { deleteSession, verifySession } from '@/lib/auth';

export async function signOutAction() {
  await deleteSession();
  redirect('/auth/sign-in');
}

export async function getSessionAction() {
    return await verifySession();
}
