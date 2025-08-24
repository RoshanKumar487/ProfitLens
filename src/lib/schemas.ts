
import { z } from 'zod';

// Authentication Schemas
export const SigninSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
export type SigninInput = z.infer<typeof SigninSchema>;

export const SignupSchema = z.object({
    email: z.string().email('Invalid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const CompanyDetailsSchema = z.object({
    userName: z.string().min(2, 'Name is required.'),
    companyName: z.string().min(2, 'Company name is required.'),
    country: z.string().min(1, 'Country is required.'),
});
export type CompanyDetailsInput = z.infer<typeof CompanyDetailsSchema>;


// Employee Schema
export const EmployeeSchema = z.object({
    name: z.string().min(2, 'Name is required'),
    position: z.string().min(2, 'Position is required'),
    salary: z.number().min(0, 'Salary must be a positive number'),
    description: z.string().optional(),
    dateOfBirth: z.date().optional(),
    joiningDate: z.date().optional(),
    fatherName: z.string().optional(),
    motherName: z.string().optional(),
    selfPhoneNo: z.string().optional(),
    qualification: z.string().optional(),
    experience: z.string().optional(),
    permanentAddressHNo: z.string().optional(),
    permanentAddressPS: z.string().optional(),
    permanentAddressPost: z.string().optional(),
    permanentAddressDist: z.string().optional(),
    permanentAddressState: z.string().optional(),
    permanentAddressPin: z.string().optional(),
    guarantorName: z.string().optional(),
    guarantorPhone: z.string().optional(),
    height: z.string().optional(),
    weight: z.string().optional(),
    identificationMarks: z.string().optional(),
    profilePictureUrl: z.string().url().optional().nullable(),
    signatureUrl: z.string().url().optional().nullable(),
    leftThumbImpressionUrl: z.string().url().optional().nullable(),
});
export type EmployeeInput = z.infer<typeof EmployeeSchema>;
