
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('q');

  if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim() === '') {
    return NextResponse.json([], { status: 200 });
  }
  
  // Sanitize the search term to make it case-insensitive in the query
  const lowerCaseSearchTerm = searchTerm.toLowerCase();
  const capitalizedSearchTerm = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase();


  try {
    const companiesRef = collection(db, 'companyProfiles');
    // Firestore doesn't support case-insensitive searches natively.
    // A common workaround is to query for a range, assuming names are stored consistently (e.g., Title Case).
    const q = query(
      companiesRef,
      where('name', '>=', capitalizedSearchTerm),
      where('name', '<=', capitalizedSearchTerm + '\uf8ff'),
      orderBy('name'),
      limit(10)
    );

    const querySnapshot = await getDocs(q);
    const companies = querySnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
    }));

    return NextResponse.json(companies);
  } catch (error: any) {
    console.error('Error searching companies:', error);
    return NextResponse.json({ error: 'Failed to search companies' }, { status: 500 });
  }
}
