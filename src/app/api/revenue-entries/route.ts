
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
  try {
    const { db } = await connectToDatabase();
    const entries = await db.collection(COLLECTION_NAME)
      .find({})
      .sort({ date: -1 }) // Sort by date descending
      .limit(5) // Get the last 5 entries
      .toArray();
    
    // Map _id to id and convert date to string if it's a Date object
    const formattedEntries = entries.map(entry => ({
      ...entry,
      id: entry._id.toString(),
      date: entry.date instanceof Date ? entry.date.toISOString() : entry.date, 
      _id: undefined, // Remove original _id or keep if preferred
    }));
    
    return NextResponse.json(formattedEntries, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch revenue entries:', error);
    return NextResponse.json({ message: 'Failed to fetch revenue entries' }, { status: 500 });
  }
}

// Create a new revenue entry
export async function POST(request: NextRequest) {
  try {
    const entryData: RevenueEntryData = await request.json();
    const { db } = await connectToDatabase();

    // Ensure date is stored as a Date object in MongoDB
    const newEntry = {
      ...entryData,
      date: new Date(entryData.date), 
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(newEntry);
    
    if (!result.insertedId) {
        throw new Error('Failed to insert revenue entry.');
    }

    return NextResponse.json({ 
        message: 'Revenue entry saved successfully', 
        id: result.insertedId.toString(),
        ...newEntry,
        date: newEntry.date.toISOString(), // Return date as ISO string
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to save revenue entry:', error);
    const message = error instanceof Error ? error.message : 'Failed to save revenue entry';
    return NextResponse.json({ message }, { status: 500 });
  }
}
