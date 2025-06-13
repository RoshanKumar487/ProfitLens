
// src/app/api/company-details/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import type { Collection, ObjectId } from 'mongodb';

interface CompanyDetails {
  _id?: ObjectId; // MongoDB uses _id
  name: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  website: string;
}

const COLLECTION_NAME = 'company_details';

// Helper function to get the collection
async function getCompanyDetailsCollection(): Promise<Collection<CompanyDetails>> {
  const { db } = await connectToDatabase();
  return db.collection<CompanyDetails>(COLLECTION_NAME);
}

// Handles GET requests to /api/company-details
export async function GET() {
  try {
    const collection = await getCompanyDetailsCollection();
    const details = await collection.findOne({});

    if (!details) {
      // Return a default structure if no details are found
      return NextResponse.json({
        name: '',
        address: '',
        gstin: '',
        phone: '',
        email: '',
        website: '',
      });
    }

    // Prepare the data for the response, excluding _id
    // Ensure all fields are present, defaulting to empty strings if null/undefined from DB
    const responseData = {
      name: details.name || '',
      address: details.address || '',
      gstin: details.gstin || '',
      phone: details.phone || '',
      email: details.email || '',
      website: details.website || '',
    };
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('[API COMPANY_DETAILS GET] Error:', error);
    let errorMessage = 'Failed to fetch company details.';
    
    // Check if the error message indicates a MONGODB_URI or connection issue
    if (typeof error.message === 'string') {
      if (error.message.includes('Invalid scheme') || error.message.includes('mongodb+srv') || error.message.includes('mongodb://')) {
          errorMessage = `Server Error: ${error.message}. Please ensure your MONGODB_URI environment variable is correctly configured.`;
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('failed to connect') || error.message.includes('ENOTFOUND')) {
          errorMessage = `Server Error: Could not connect to the database. ${error.message}`;
      } else {
        errorMessage = error.message; // Use the original error message if it's not a known connection issue
      }
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// NO OTHER EXPORTS OR FUNCTIONS NAMED GET, POST, PUT, DELETE etc. SHOULD BE IN THIS FILE
// The POST function was previously removed as per user request.
