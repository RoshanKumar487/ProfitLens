
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { app as adminApp } from '@/lib/firebaseAdminConfig';
import { headers } from 'next/headers';


async function getCompanyIdForCurrentUser(): Promise<string | null> {
  const headersList = headers();
  const idToken = headersList.get('x-firebase-id-token');

  if (!idToken) {
    console.error("API Error: No ID token provided in headers.");
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
    // Firestore queries are case-sensitive. A common workaround is to store a lowercase version of the field.
    // We will query against this `name_lowercase` field.
    const q = query(
      employeesRef,
      where('companyId', '==', companyId),
      where('name_lowercase', '>=', lowerCaseSearchTerm),
      where('name_lowercase', '<=', lowerCaseSearchTerm + '\uf8ff'),
      orderBy('name_lowercase'),
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
    // Suggesting an index is a common error, so we can provide a more helpful message.
    if (error.message?.includes('indexes')) {
        console.error("Firestore index missing. Please create a composite index for the 'employees' collection on 'companyId' (asc) and 'name_lowercase' (asc).");
        return NextResponse.json({ error: 'Database configuration error. Please contact support.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to search employees' }, { status: 500 });
  }
}
