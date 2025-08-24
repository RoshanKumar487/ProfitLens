
'use server';

import { revalidatePath } from 'next/cache';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/firebaseStorageUtils';
import { type EmployeeInput } from '@/lib/schemas';

// This file now uses a mock in-memory store instead of a database.

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

// Mock in-memory store
let MOCK_EMPLOYEES: EmployeeDisplay[] = [
    { id: '1', name: 'Alice Johnson', position: 'Software Engineer', salary: 95000, description: 'Frontend specialist with 5 years of experience.', joiningDate: new Date('2021-06-01') },
    { id: '2', name: 'Bob Williams', position: 'Project Manager', salary: 105000, description: 'Manages the core product development team.', joiningDate: new Date('2020-02-15') },
    { id: '3', name: 'Charlie Brown', position: 'UX/UI Designer', salary: 85000, description: 'Focuses on user experience and interface design.', joiningDate: new Date('2022-09-01') },
];

export async function uploadFile(file: File, path: string, companyId: string): Promise<string> {
    const companyPath = `companies/${companyId}/${path}`;
    const downloadURL = await uploadFileToStorage(file, companyPath);
    return downloadURL;
}

export async function getEmployees(companyId: string): Promise<EmployeeDisplay[]> {
  // companyId is unused in mock, but kept for signature consistency
  return Promise.resolve([...MOCK_EMPLOYEES]);
}

export async function getEmployeeById(employeeId: string, companyId: string): Promise<EmployeeDisplay | null> {
    const employee = MOCK_EMPLOYEES.find(emp => emp.id === employeeId);
    return Promise.resolve(employee || null);
}

export async function updateEmployee(
  employeeId: string | null,
  companyId: string,
  data: EmployeeInput & { profilePictureUrl?: string | null, signatureUrl?: string | null, leftThumbImpressionUrl?: string | null }
) {
  const { profilePictureUrl, signatureUrl, leftThumbImpressionUrl, ...employeeData } = data;

  const payload = {
    ...employeeData,
    profilePictureUrl: profilePictureUrl || undefined,
    signatureUrl: signatureUrl || undefined,
    leftThumbImpressionUrl: leftThumbImpressionUrl || undefined,
  };

  if (employeeId) {
    // Update existing
    MOCK_EMPLOYEES = MOCK_EMPLOYEES.map(emp =>
      emp.id === employeeId ? { ...emp, ...payload } : emp
    );
  } else {
    // Create new
    const newEmployee: EmployeeDisplay = {
      id: `emp-${Date.now()}`,
      ...payload,
      name: payload.name || 'New Employee',
      position: payload.position || 'N/A',
      salary: payload.salary || 0,
    };
    MOCK_EMPLOYEES.push(newEmployee);
  }

  revalidatePath('/employees');
  return { success: true, message: `Employee ${employeeId ? 'updated' : 'added'} successfully.` };
}

export async function deleteEmployee(employeeId: string, companyId: string) {
    const employee = MOCK_EMPLOYEES.find(emp => emp.id === employeeId);
    if (employee) {
        // Mock file deletion
        if (employee.profilePictureUrl) console.log(`[Mock Delete] Deleting ${employee.profilePictureUrl}`);
        if (employee.signatureUrl) console.log(`[Mock Delete] Deleting ${employee.signatureUrl}`);
        if (employee.leftThumbImpressionUrl) console.log(`[Mock Delete] Deleting ${employee.leftThumbImpressionUrl}`);
        
        MOCK_EMPLOYEES = MOCK_EMPLOYEES.filter(emp => emp.id !== employeeId);
        revalidatePath('/employees');
        return { success: true, message: "Employee deleted successfully." };
    }
    return { success: false, message: "Employee not found." };
}
