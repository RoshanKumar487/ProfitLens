
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/app/auth/actions';
import { type EmployeeInput } from '@/lib/schemas';

export interface EmployeeDisplay {
  id: string;
  name: string;
  position: string;
  salary: number;
  description?: string;
  dateOfBirth?: Date;
  joiningDate?: Date;
  fatherName?: string;
  motherName?: string;
  selfPhoneNo?: string;
  qualification?: string;
  experience?: string;
  permanentAddressHNo?: string;
  permanentAddressPS?: string;
  permanentAddressPost?: string;
  permanentAddressDist?: string;
  permanentAddressState?: string;
  permanentAddressPin?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  height?: string;
  weight?: string;
  identificationMarks?: string;
  profilePictureUrl?: string;
  signatureUrl?: string;
  leftThumbImpressionUrl?: string;
}

async function getCompanyId(): Promise<ObjectId | null> {
    const session = await getSession();
    if (!session?.companyId) {
        return null;
    }
    return new ObjectId(session.companyId);
}


export async function uploadFile(file: File, path: string): Promise<string> {
    // This requires a proper file storage service like Firebase Storage or AWS S3.
    // Returning a placeholder for now.
    console.log(`Mock Upload: Uploading ${file.name} to ${path}`);
    return `https://placehold.co/200x200.png?text=Uploaded`;
}


export async function getEmployees(): Promise<EmployeeDisplay[]> {
    const companyId = await getCompanyId();
    if (!companyId) return [];

    try {
        const { db } = await connectToDatabase();
        const employees = await db.collection('employees')
            .find({ companyId })
            .sort({ name: 1 })
            .toArray();
        
        return employees.map(doc => {
            const { _id, companyId, ...rest } = doc;
            return { id: _id.toHexString(), ...rest } as unknown as EmployeeDisplay;
        });
    } catch (error) {
        console.error("Failed to get employees:", error);
        return [];
    }
}


export async function getEmployeeById(employeeId: string): Promise<EmployeeDisplay | null> {
    const companyId = await getCompanyId();
    if (!companyId || !ObjectId.isValid(employeeId)) return null;

    try {
        const { db } = await connectToDatabase();
        const doc = await db.collection('employees').findOne({ 
            _id: new ObjectId(employeeId),
            companyId: companyId
        });

        if (!doc) return null;
        
        const { _id, companyId: docCompanyId, ...rest } = doc;
        return { id: _id.toHexString(), ...rest } as unknown as EmployeeDisplay;

    } catch (error) {
        console.error(`Failed to get employee ${employeeId}:`, error);
        return null;
    }
}

export async function updateEmployee(
  employeeId: string | null,
  companyIdString: string,
  data: EmployeeInput & { profilePictureUrl?: string | null, signatureUrl?: string | null, leftThumbImpressionUrl?: string | null }
) {
    const companyId = new ObjectId(companyIdString);
    if (!companyId) {
        return { success: false, message: "User is not associated with a company." };
    }

    try {
        const { db } = await connectToDatabase();
        const collection = db.collection('employees');

        if (employeeId && ObjectId.isValid(employeeId)) {
            // Update existing employee
            const result = await collection.updateOne(
                { _id: new ObjectId(employeeId), companyId: companyId },
                { $set: data }
            );
            if (result.matchedCount === 0) {
                 return { success: false, message: "Employee not found or you don't have permission to edit." };
            }
        } else {
            // Add new employee
            await collection.insertOne({ ...data, companyId, createdAt: new Date() });
        }
        
        revalidatePath('/employees');
        return { success: true, message: `Employee ${employeeId ? 'updated' : 'added'} successfully.` };
    } catch (error: any) {
        return { success: false, message: `Failed to save employee: ${error.message}` };
    }
}


export async function deleteEmployee(employeeId: string) {
    const companyId = await getCompanyId();
    if (!companyId || !ObjectId.isValid(employeeId)) {
        return { success: false, message: 'Invalid employee ID or company.' };
    }

    try {
        const { db } = await connectToDatabase();
        await db.collection('employees').deleteOne({
            _id: new ObjectId(employeeId),
            companyId,
        });
        revalidatePath('/employees');
        return { success: true, message: 'Employee deleted successfully.' };
    } catch (error: any) {
        return { success: false, message: `Failed to delete employee: ${error.message}` };
    }
}

    