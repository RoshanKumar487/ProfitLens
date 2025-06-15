
// src/app/api/revenue-entries/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { type ObjectId } from 'mongodb';

const COLLECTION_NAME = 'revenue_entries';

interface RevenueEntryData {
  date: string | Date;
  amount: number;
  source: string;
  description?: string;
}

// Get recent revenue entries
export async function GET() {
  console.log('[API REVENUE_ENTRIES GET] Received request.');
  try {
    console.log('[API REVENUE_ENTRIES GET] Connecting to database for collection:', COLLECTION_NAME);
    const { db } = await connectToDatabase();
    console.log('[API REVENUE_ENTRIES GET] Fetching recent revenue entries (limit 5, sorted by date descending).');
    const entries = await db.collection(COLLECTION_NAME)
      .find({})
      .sort({ date: -1 }) 
      .limit(5) 
      .toArray();
    
    console.log(`[API REVENUE_ENTRIES GET] Found ${entries.length} entries. Formatting for response.`);
    const formattedEntries = entries.map(entry => ({
      ...entry,
      id: entry._id.toString(),
      date: entry.date instanceof Date ? entry.date.toISOString() : entry.date, 
      _id: undefined, 
    }));
    
    return NextResponse.json(formattedEntries, { status: 200 });
  } catch (error: any) {
    console.error('[API REVENUE_ENTRIES GET] Failed to fetch revenue entries. Error:', error);
    let errorMessage = 'Failed to fetch revenue entries due to a server error.';
    if (error.message && typeof error.message === 'string') {
        errorMessage = `Server Error: ${error.message}`;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// Create a new revenue entry
export async function POST(request: NextRequest) {
  console.log('[API REVENUE_ENTRIES POST] Received request.');
  try {
    const entryData: RevenueEntryData = await request.json();
    console.log('[API REVENUE_ENTRIES POST] Request body (entryData):', entryData);

    console.log('[API REVENUE_ENTRIES POST] Connecting to database for collection:', COLLECTION_NAME);
    const { db } = await connectToDatabase();

    const newEntry = {
      ...entryData,
      date: new Date(entryData.date), 
    };
    console.log('[API REVENUE_ENTRIES POST] Prepared new entry for insertion:', newEntry);

    const result = await db.collection(COLLECTION_NAME).insertOne(newEntry);
    console.log('[API REVENUE_ENTRIES POST] Database insert result:', result);
    
    if (!result.insertedId) {
        console.error('[API REVENUE_ENTRIES POST] Failed to insert revenue entry into database. InsertedId is missing.');
        throw new Error('Failed to insert revenue entry.');
    }

    console.log(`[API REVENUE_ENTRIES POST] Revenue entry saved successfully with ID: ${result.insertedId.toString()}.`);
    return NextResponse.json({ 
        message: 'Revenue entry saved successfully', 
        id: result.insertedId.toString(),
        ...newEntry,
        date: newEntry.date.toISOString(), 
    }, { status: 201 });

  } catch (error: any) {
    console.error('[API REVENUE_ENTRIES POST] Failed to save revenue entry. Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save revenue entry';
    return NextResponse.json({ message: `Server Error: ${message}` }, { status: 500 });
  }
}
