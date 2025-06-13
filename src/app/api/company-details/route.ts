
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import type { Collection } from 'mongodb';

interface CompanyDetails {
  name: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  website: string;
  _id?: any; 
}

const COLLECTION_NAME = 'company_details';

async function getCompanyDetailsCollection(): Promise<Collection<CompanyDetails>> {
  const { db } = await connectToDatabase();
  return db.collection<CompanyDetails>(COLLECTION_NAME);
}

export async function GET() {
  try {
    const collection = await getCompanyDetailsCollection();
    const details = await collection.findOne({});

    if (!details) {
      return NextResponse.json({
        name: '',
        address: '',
        gstin: '',
        phone: '',
        email: '',
        website: '',
      });
    }

    const { _id, ...cleanedDetails } = details;
    const responseData = {
      name: cleanedDetails.name || '',
      address: cleanedDetails.address || '',
      gstin: cleanedDetails.gstin || '',
      phone: cleanedDetails.phone || '',
      email: cleanedDetails.email || '',
      website: cleanedDetails.website || '',
    };
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('[API COMPANY_DETAILS GET] Error:', error);
    let errorMessage = 'Failed to fetch company details.';
     if (error.message) {
      errorMessage = error.message;
    }
    // Specific check for MongoDB URI issues
    if (typeof error.message === 'string' && (error.message.includes('Invalid scheme') || error.message.includes('mongodb+srv') || error.message.includes('mongodb://'))) {
        errorMessage = `Server Error: ${error.message}. Please ensure your MONGODB_URI environment variable is correctly configured.`;
    } else if (typeof error.message === 'string' && (error.message.includes('ECONNREFUSED') || error.message.includes('failed to connect'))) {
        errorMessage = `Server Error: Could not connect to the database. ${error.message}`;
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// POST function was removed to make company details view-only for database interactions.
