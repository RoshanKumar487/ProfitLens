
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { app as adminApp } from '@/lib/firebaseAdminConfig';
import { headers } from 'next/headers';


async function getCompanyIdForCurrentUser(): Promise<string | null> {
  const headersList = headers();
  const idToken = headersList.get('x-firebase-id-token');

  if (!idToken) {
    console.error("API Error: No ID token provided.");
    return null;
  }
  
  try {
    const decodedToken = await getAuth(adminApp).verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    if (!uid) return null;

    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return userDocSnap.data().companyId || null;
    }
    return null;
  } catch (error) {
    console.error("API Error: Could not verify ID token or get user data.", error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('q');
  
  const companyId = await getCompanyIdForCurrentUser();

  if (!companyId) {
      return NextResponse.json({ error: 'User is not associated with a company.' }, { status: 403 });
  }

  if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim() === '') {
    return NextResponse.json([], { status: 200 });
  }
  
  const lowerCaseSearchTerm = searchTerm.toLowerCase();

  try {
    const employeesRef = collection(db, 'employees');
    const q = query(
      employeesRef,
      where('companyId', '==', companyId),
      where('name', '>=', searchTerm),
      where('name', '<=', searchTerm + '\uf8ff'),
      orderBy('name'),
      limit(10)
    );

    const querySnapshot = await getDocs(q);
    const employees = querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
    }));

    return NextResponse.json(employees);
  } catch (error: any) {
    console.error('Error searching employees:', error);
    return NextResponse.json({ error: 'Failed to search employees' }, { status: 500 });
  }
}
