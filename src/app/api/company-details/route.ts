
// src/app/api/company-details/route.ts
import type { NextRequest } from 'next/server';
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
  console.log('[API COMPANY_DETAILS] Connecting to database for collection:', COLLECTION_NAME);
  const { db } = await connectToDatabase();
  return db.collection<CompanyDetails>(COLLECTION_NAME);
}

// Handles GET requests to /api/company-details
export async function GET() {
  console.log('[API COMPANY_DETAILS GET] Received request.');
  try {
    const collection = await getCompanyDetailsCollection();
    console.log('[API COMPANY_DETAILS GET] Fetching company details from database.');
    const details = await collection.findOne({});

    if (!details) {
      console.log('[API COMPANY_DETAILS GET] No company details found in database. Returning default structure.');
      return NextResponse.json({
        name: '',
        address: '',
        gstin: '',
        phone: '',
        email: '',
        website: '',
      });
    }

    console.log('[API COMPANY_DETAILS GET] Company details found. Preparing response.');
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
    console.error('[API COMPANY_DETAILS GET] Critical error:', error);
    let errorMessage = 'Failed to fetch company details due to a server error.';
    
    if (typeof error.message === 'string') {
      if (error.message.includes('Invalid scheme') || error.message.includes('mongodb+srv') || error.message.includes('mongodb://')) {
          errorMessage = `Server Error: ${error.message}. Please ensure your MONGODB_URI environment variable is correctly configured.`;
          console.error('[API COMPANY_DETAILS GET] MONGODB_URI configuration error:', error.message);
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('failed to connect') || error.message.includes('ENOTFOUND')) {
          errorMessage = `Server Error: Could not connect to the database. ${error.message}`;
          console.error('[API COMPANY_DETAILS GET] Database connection error:', error.message);
      } else {
        errorMessage = `Server Error: ${error.message}`;
      }
    }
    // This response might not be seen if the error is too early (e.g., module load),
    // but it's good practice to try and return JSON.
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// Handles POST requests to /api/company-details to update or create
export async function POST(request: NextRequest) {
  console.log('[API COMPANY_DETAILS POST] Received request.');
  try {
    const detailsToSave: Omit<CompanyDetails, '_id'> = await request.json();
    console.log('[API COMPANY_DETAILS POST] Request body (detailsToSave):', detailsToSave);

    if (!detailsToSave.name || !detailsToSave.address || !detailsToSave.gstin) {
        console.warn('[API COMPANY_DETAILS POST] Validation failed: Company Name, Address, and GSTIN are required.');
        return NextResponse.json({ message: 'Company Name, Address, and GSTIN are required.' }, { status: 400 });
    }

    const collection = await getCompanyDetailsCollection();
    console.log('[API COMPANY_DETAILS POST] Attempting to update/insert company details into database.');

    const result = await collection.updateOne(
      {}, 
      { $set: detailsToSave },
      { upsert: true }
    );

    console.log('[API COMPANY_DETAILS POST] Database operation result:', result);

    if (result.modifiedCount > 0 || result.upsertedId) {
       console.log(`[API COMPANY_DETAILS POST] Details ${result.upsertedId ? 'upserted with ID: ' + result.upsertedId : 'modified'}. Fetching updated record.`);
       const savedDetails = await collection.findOne({});
       if (savedDetails) {
         const responseData = {
            name: savedDetails.name || '',
            address: savedDetails.address || '',
            gstin: savedDetails.gstin || '',
            phone: savedDetails.phone || '',
            email: savedDetails.email || '',
            website: savedDetails.website || '',
          };
         console.log('[API COMPANY_DETAILS POST] Successfully saved and retrieved details. Sending response:', responseData);
         return NextResponse.json(responseData, { status: 200 });
       }
       console.warn('[API COMPANY_DETAILS POST] Details saved, but failed to retrieve updated record for response.');
       return NextResponse.json({ message: 'Details saved, but failed to retrieve updated record.' }, { status: 200 });
    } else if (result.matchedCount > 0) {
        console.log('[API COMPANY_DETAILS POST] Data already up to date. No modifications needed.');
        const existingDetails = await collection.findOne({});
         if (existingDetails) {
            const responseData = {
                name: existingDetails.name || '',
                address: existingDetails.address || '',
                gstin: existingDetails.gstin || '',
                phone: existingDetails.phone || '',
                email: existingDetails.email || '',
                website: existingDetails.website || '',
            };
            return NextResponse.json(responseData, { status: 200 });
        }
        return NextResponse.json({ message: 'Data already up to date.' }, { status: 200 });
    } else {
      console.error('[API COMPANY_DETAILS POST] Failed to save company details. No changes were made, and no document matched for update (upsert should have created one). Result:', result);
      return NextResponse.json({ message: 'Failed to save company details. No changes were made.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API COMPANY_DETAILS POST] Critical error:', error);
    let errorMessage = 'Failed to save company details due to a server error.';
     if (typeof error.message === 'string') {
      if (error.message.includes('Invalid scheme') || error.message.includes('mongodb+srv') || error.message.includes('mongodb://')) {
          errorMessage = `Server Error: ${error.message}. Please ensure your MONGODB_URI environment variable is correctly configured.`;
          console.error('[API COMPANY_DETAILS POST] MONGODB_URI configuration error:', error.message);
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('failed to connect') || error.message.includes('ENOTFOUND')) {
          errorMessage = `Server Error: Could not connect to the database. ${error.message}`;
          console.error('[API COMPANY_DETAILS POST] Database connection error:', error.message);
      } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) { 
          errorMessage = 'Server Error: Invalid JSON data received in the request body.';
          console.error('[API COMPANY_DETAILS POST] Invalid JSON in request body:', error.message);
      } else {
        errorMessage = `Server Error: ${error.message}`;
      }
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
