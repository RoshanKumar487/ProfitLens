
// src/app/api/company-details/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

const COLLECTION_NAME = 'company_details';

// Get company details
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const details = await db.collection(COLLECTION_NAME).findOne({});
    if (!details) {
      return NextResponse.json({
        name: '', address: '', gstin: '', phone: '', email: '', website: ''
      }, { status: 200 });
    }
    // Ensure _id is not sent to the client or convert it to string if needed
    const { _id, ...rest } = details;
    return NextResponse.json(rest, { status: 200 });
  } catch (error) {
    console.error('API Error - Failed to fetch company details:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while fetching details.';
    return NextResponse.json({ message: `Server Error: ${errorMessage}` }, { status: 500 });
  }
}

// POST function removed as per user request to disable saving.
