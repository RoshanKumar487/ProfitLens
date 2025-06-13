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
    console.error('Failed to fetch company details:', error);
    return NextResponse.json({ message: 'Failed to fetch company details' }, { status: 500 });
  }
}

// Create or Update company details
export async function POST(request: NextRequest) {
  try {
    const details = await request.json();
    const { db } = await connectToDatabase();

    // Use updateOne with upsert: true to either update existing or insert new
    // Assuming there's only one document for company details, we can use a fixed filter or update any doc.
    // For simplicity, we'll update (or insert if not exists) the first document found or a new one.
    // A more robust way might be to have a specific identifier if multiple company profiles were possible.
    await db.collection(COLLECTION_NAME).updateOne(
      {}, // An empty filter will match the first document if using for a single profile
      { $set: details },
      { upsert: true }
    );
    return NextResponse.json({ message: 'Company details saved successfully' }, { status: 200 });
  } catch (error) {
    console.error('Failed to save company details:', error);
    return NextResponse.json({ message: 'Failed to save company details' }, { status: 500 });
  }
}
