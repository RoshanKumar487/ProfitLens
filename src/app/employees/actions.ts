
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/app/auth/actions';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/firebaseStorageUtils';
import { ObjectId } from 'mongodb';
import type { EmployeeInput } from '@/lib/schemas';

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

export async function uploadFile(file: File, path: string, companyId: string): Promise<string> {
    const companyPath = `companies/${companyId}/${path}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    // This function now needs to be defined, assuming firebaseStorageUtils.ts
    const downloadURL = await uploadFileToStorage(file, companyPath);
    return downloadURL;
}

export async function getEmployees(companyId: string): Promise<EmployeeDisplay[]> {
  try {
    const { db } = await connectToDatabase();
    const employees = await db.collection('employees')
      .find({ companyId: new ObjectId(companyId) })
      .sort({ createdAt: -1 })
      .toArray();

    return employees.map(emp => ({
      ...emp,
      id: emp._id.toString(),
      companyId: emp.companyId.toString(),
      joiningDate: emp.joiningDate,
      dateOfBirth: emp.dateOfBirth
    })) as EmployeeDisplay[];
  } catch (error) {
    console.error("Failed to get employees:", error);
    return [];
  }
}

export async function getEmployeeById(employeeId: string, companyId: string): Promise<EmployeeDisplay | null> {
    try {
        const { db } = await connectToDatabase();
        const employee = await db.collection('employees').findOne({
            _id: new ObjectId(employeeId),
            companyId: new ObjectId(companyId)
        });

        if (!employee) return null;

        return {
            ...employee,
            id: employee._id.toString(),
            companyId: employee.companyId.toString(),
        } as EmployeeDisplay;
    } catch (error) {
        console.error("Failed to get employee by ID:", error);
        return null;
    }
}


export async function updateEmployee(
  employeeId: string | null,
  companyId: string,
  data: EmployeeInput & { profilePictureUrl?: string | null, signatureUrl?: string | null, leftThumbImpressionUrl?: string | null }
) {
  try {
    const { db } = await connectToDatabase();
    const { profilePictureUrl, signatureUrl, leftThumbImpressionUrl, ...employeeData } = data;
    
    const payload = {
      ...employeeData,
      companyId: new ObjectId(companyId),
      profilePictureUrl: profilePictureUrl || undefined,
      signatureUrl: signatureUrl || undefined,
      leftThumbImpressionUrl: leftThumbImpressionUrl || undefined,
      updatedAt: new Date(),
    };

    if (employeeId) {
      // Update existing employee
      await db.collection('employees').updateOne(
        { _id: new ObjectId(employeeId), companyId: new ObjectId(companyId) },
        { $set: payload }
      );
    } else {
      // Create new employee
      await db.collection('employees').insertOne({
        ...payload,
        createdAt: new Date(),
      });
    }
    
    revalidatePath('/employees');
    return { success: true, message: `Employee ${employeeId ? 'updated' : 'added'} successfully.` };
  } catch (error: any) {
    console.error('Failed to save employee:', error);
    return { success: false, message: `Failed to save employee: ${error.message}` };
  }
}

export async function deleteEmployee(employeeId: string, companyId: string) {
    try {
        const { db } = await connectToDatabase();
        // Also delete associated files from storage
        const employee = await db.collection('employees').findOne({ _id: new ObjectId(employeeId), companyId: new ObjectId(companyId) });
        if (employee) {
            const deletePromises: Promise<void>[] = [];
            if (employee.profilePictureUrl) deletePromises.push(deleteFileFromStorage(employee.profilePictureUrl));
            if (employee.signatureUrl) deletePromises.push(deleteFileFromStorage(employee.signatureUrl));
            if (employee.leftThumbImpressionUrl) deletePromises.push(deleteFileFromStorage(employee.leftThumbImpressionUrl));
            await Promise.all(deletePromises);
        }

        const result = await db.collection('employees').deleteOne({
            _id: new ObjectId(employeeId),
            companyId: new ObjectId(companyId)
        });

        if (result.deletedCount === 0) {
            return { success: false, message: "Employee not found or you don't have permission." };
        }

        revalidatePath('/employees');
        return { success: true, message: "Employee deleted successfully." };
    } catch (error: any) {
        console.error("Failed to delete employee:", error);
        return { success: false, message: "Failed to delete employee." };
    }
}
