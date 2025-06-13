
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
    
    if (typeof error.message === 'string') {
      if (error.message.includes('Invalid scheme') || error.message.includes('mongodb+srv') || error.message.includes('mongodb://')) {
          errorMessage = `Server Error: ${error.message}. Please ensure your MONGODB_URI environment variable is correctly configured.`;
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('failed to connect') || error.message.includes('ENOTFOUND')) {
          errorMessage = `Server Error: Could not connect to the database. ${error.message}`;
      } else {
        errorMessage = error.message;
      }
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

// Handles POST requests to /api/company-details to update or create
export async function POST(request: NextRequest) {
  try {
    const detailsToSave: Omit<CompanyDetails, '_id'> = await request.json(); // Data from client won't have _id

    // Basic validation (optional, can be more extensive)
    if (!detailsToSave.name || !detailsToSave.address || !detailsToSave.gstin) {
        return NextResponse.json({ message: 'Company Name, Address, and GSTIN are required.' }, { status: 400 });
    }

    const collection = await getCompanyDetailsCollection();

    const result = await collection.updateOne(
      {}, // An empty filter means update the first document found or insert if no documents exist
      { $set: detailsToSave },
      { upsert: true }
    );

    if (result.modifiedCount > 0 || result.upsertedId) {
       // Fetch the (potentially upserted) document to return it, ensuring consistency
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
         return NextResponse.json(responseData, { status: 200 });
       }
       // Fallback if findOne fails after upsert/update (should ideally not happen)
       return NextResponse.json({ message: 'Details saved, but failed to retrieve updated record.' }, { status: 200 });
    } else if (result.matchedCount > 0) {
        // Data was same as existing, nothing modified, but considered success
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
      // This case should ideally not be reached with upsert:true and empty filter
      // if the operation somehow failed without throwing an error.
      return NextResponse.json({ message: 'Failed to save company details. No changes were made.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API COMPANY_DETAILS POST] Error:', error);
    let errorMessage = 'Failed to save company details.';
     if (typeof error.message === 'string') {
      if (error.message.includes('Invalid scheme') || error.message.includes('mongodb+srv') || error.message.includes('mongodb://')) {
          errorMessage = `Server Error: ${error.message}. Please ensure your MONGODB_URI environment variable is correctly configured.`;
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('failed to connect') || error.message.includes('ENOTFOUND')) {
          errorMessage = `Server Error: Could not connect to the database. ${error.message}`;
      } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) { // Check if body was valid JSON
          errorMessage = 'Server Error: Invalid JSON data received in the request body.';
      } else {
        errorMessage = error.message;
      }
    }
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
