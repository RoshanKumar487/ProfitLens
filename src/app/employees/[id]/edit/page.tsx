
'use client';

import React, { useState, FormEvent, useCallback, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users2, Loader2, Save, Camera, UploadCloud, XCircle, SwitchCamera, FileText, Fingerprint, PenSquare, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/firebaseStorageUtils';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import Image from 'next/image';
import type { EmployeeDisplay } from '../../page';

const getInitials = (name: string = "") => {
  const names = name.split(' ');
  let initials = names[0] ? names[0][0] : '';
  if (names.length > 1 && names[names.length - 1]) {
    initials += names[names.length - 1][0];
  }
  return initials.toUpperCase();
};

export default function EditEmployeePage() {
    const { user, currencySymbol } = useAuth();
    const router = useRouter();
    const params = useParams();
    const employeeId = params.id as string;
    const { toast } = useToast();

    // Form State
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [employee, setEmployee] = useState<Partial<EmployeeDisplay>>({});
    
    // Files
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
    const [leftThumbImpressionFile, setLeftThumbImpressionFile] = useState<File | null>(null);
    const [leftThumbImpressionPreview, setLeftThumbImpressionPreview] = useState<string | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>, setPreview?: React.Dispatch<React.SetStateAction<string | null>>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) return toast({ title: "Image Too Large", description: "Images must be less than 2MB.", variant: "destructive" });
            if (!file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) return toast({ title: "File Too Large", description: "File must be less than 10MB.", variant: "destructive" });
            setFile(file);
            if (setPreview) setPreview(URL.createObjectURL(file));
        } else {
            setFile(null);
            if (setPreview) setPreview(null);
        }
    };
    
    const handleInputChange = (field: keyof EmployeeDisplay, value: any) => {
        setEmployee(prev => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        if (!employeeId || !user?.companyId) return;

        const fetchEmployee = async () => {
            setIsLoadingData(true);
            try {
                const employeeRef = doc(db, 'employees', employeeId);
                const docSnap = await getDoc(employeeRef);

                if (!docSnap.exists() || docSnap.data().companyId !== user.companyId) {
                    toast({ title: "Not Found", description: "Employee not found or you don't have permission.", variant: "destructive"});
                    router.push('/employees');
                    return;
                }
                const data = docSnap.data();
                setEmployee({
                    ...data,
                    id: docSnap.id,
                    dateOfBirth: data.dateOfBirth?.toDate(),
                    joiningDate: data.joiningDate?.toDate(),
                });
                setProfilePicturePreview(data.profilePictureUrl || null);
                setLeftThumbImpressionPreview(data.leftThumbImpressionUrl || null);
                setSignaturePreview(data.signatureUrl || null);

            } catch (error) {
                console.error("Error fetching employee:", error);
                toast({ title: 'Error', description: 'Could not load employee data.', variant: 'destructive'});
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchEmployee();
    }, [employeeId, user?.companyId, router, toast]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !user.companyId || !employee.id) return toast({ title: "Authentication Error", variant: "destructive" });
        if (!employee.name || !employee.position || employee.salary === undefined) return toast({ title: "Missing Information", description: "Name, position, and salary are required.", variant: "destructive" });
        
        const salaryNum = Number(employee.salary);
        if (isNaN(salaryNum) || salaryNum < 0) return toast({ title: "Invalid Salary", variant: "destructive"});

        setIsSaving(true);
        try {
            const employeeRef = doc(db, 'employees', employee.id);
            const dataToSave = { ...employee, salary: salaryNum, updatedAt: serverTimestamp() };

            const uploadIfNeeded = async (file: File | null, oldPath: string | undefined, type: string) => {
              if (!file) return { url: undefined, path: undefined };
              if (oldPath) await deleteFileFromStorage(oldPath).catch(e => console.warn(`Old ${type} deletion failed`, e));
              const newPath = `employees/${user.companyId}/${employee.id}/${type}.${file.name.split('.').pop()}`;
              const newUrl = await uploadFileToStorage(file, newPath);
              return { url: newUrl, path: newPath };
            };
        
            const [profilePic, thumbFile, sigFile] = await Promise.all([
                uploadIfNeeded(profilePictureFile, employee.profilePictureStoragePath, 'profileImage'),
                uploadIfNeeded(leftThumbImpressionFile, employee.leftThumbImpressionStoragePath, 'thumbImpression'),
                uploadIfNeeded(signatureFile, employee.signatureStoragePath, 'signature')
            ]);

            if (profilePic.url !== undefined) { dataToSave.profilePictureUrl = profilePic.url; dataToSave.profilePictureStoragePath = profilePic.path; }
            if (thumbFile.url !== undefined) { dataToSave.leftThumbImpressionUrl = thumbFile.url; dataToSave.leftThumbImpressionStoragePath = thumbFile.path; }
            if (sigFile.url !== undefined) { dataToSave.signatureUrl = sigFile.url; dataToSave.signatureStoragePath = sigFile.path; }
            
            if(dataToSave.dateOfBirth) dataToSave.dateOfBirth = Timestamp.fromDate(new Date(dataToSave.dateOfBirth));
            if(dataToSave.joiningDate) dataToSave.joiningDate = Timestamp.fromDate(new Date(dataToSave.joiningDate));
            delete (dataToSave as any).id; 
            delete (dataToSave as any).createdAt;

            await updateDoc(employeeRef, dataToSave);
            toast({ title: "Employee Updated", description: `${employee.name}'s details have been saved.` });
            router.push('/employees');
        } catch (error: any) {
            toast({ title: "Save Failed", description: error.message, variant: "destructive" });
            setIsSaving(false);
        }
    };
    
    const Section = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
      <div className={className}>
        <h3 className="text-sm font-bold text-gray-800 border-b-2 border-gray-400 pb-1 mb-3">{title}</h3>
        <div className="space-y-2">{children}</div>
      </div>
    );
    const DataRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
      <div className="grid grid-cols-[120px_1fr] items-center gap-x-2 text-xs">
        <Label className="text-gray-600 font-medium text-right">{label}:</Label>
        {children}
      </div>
    );
    const WInput = (props: React.ComponentProps<typeof Input>) => <Input className="h-6 text-xs p-1" {...props} />;
    const WPopover = ({date, setDate}: {date: Date | undefined, setDate: (d: Date | undefined) => void}) => (
        <Popover><PopoverTrigger asChild><Button variant="link" className="h-6 p-1 text-xs justify-start" disabled={isSaving}>{date ? format(new Date(date), 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date ? new Date(date) : undefined} onSelect={setDate} captionLayout="dropdown-buttons" fromYear={1950} toYear={new Date().getFullYear()} initialFocus /></PopoverContent></Popover>
    );
    
    if (isLoadingData) {
         return <div className="flex items-center justify-center h-[calc(100vh-200px)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="bg-muted min-h-screen">
            <header className="bg-background/80 border-b shadow-sm sticky top-14 sm:top-16 z-20 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-2">
                    <div className="flex items-center gap-2">
                         <Button variant="ghost" size="icon" className="h-8 w-8" asChild><Link href="/employees"><ArrowLeft className="h-4 w-4" /></Link></Button>
                        <h1 className="text-lg font-bold truncate h-8 flex items-center">Edit Employee: {employee?.name}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" asChild type="button"><Link href="/employees">Cancel</Link></Button>
                        <Button onClick={handleSubmit} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </header>
            
            <main className="p-0 md:p-4 lg:p-8">
                <form onSubmit={handleSubmit}>
                    <div className="bg-white text-black font-sans w-[210mm] min-h-[297mm] mx-auto p-8 shadow-lg">
                        <header className="text-center mb-6">
                            <h1 className="text-3xl font-bold text-gray-800 uppercase tracking-wide">{user?.companyName || 'Company Name'}</h1>
                            <h2 className="text-2xl font-semibold text-gray-700 mt-4 pb-2 border-b-2 border-gray-300 text-center">Employee Bio-Data</h2>
                        </header>
                        
                        <div className="grid grid-cols-3 gap-8 pt-6">
                            <div className="col-span-2 space-y-6">
                                <Section title="Personal Details">
                                    <DataRow label="Full Name"><WInput value={employee.name || ''} onChange={e => handleInputChange('name', e.target.value)} required disabled={isSaving}/></DataRow>
                                    <DataRow label="Father's Name"><WInput value={employee.fatherName || ''} onChange={e => handleInputChange('fatherName', e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Mother's Name"><WInput value={employee.motherName || ''} onChange={e => handleInputChange('motherName', e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Date of Birth"><WPopover date={employee.dateOfBirth} setDate={(d) => handleInputChange('dateOfBirth', d)} /></DataRow>
                                    <DataRow label="Phone Number"><WInput value={employee.selfPhoneNo || ''} onChange={e => handleInputChange('selfPhoneNo', e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Qualification"><WInput value={employee.qualification || ''} onChange={e => handleInputChange('qualification', e.target.value)} disabled={isSaving}/></DataRow>
                                </Section>
                                
                                <Section title="Permanent Address">
                                    <DataRow label="H.No / Street"><WInput value={employee.permanentAddressHNo || ''} onChange={e => handleInputChange('permanentAddressHNo', e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Police Station (P.S.)"><WInput value={employee.permanentAddressPS || ''} onChange={e => handleInputChange('permanentAddressPS', e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Post Office"><WInput value={employee.permanentAddressPost || ''} onChange={e => handleInputChange('permanentAddressPost', e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="District"><WInput value={employee.permanentAddressDist || ''} onChange={e => handleInputChange('permanentAddressDist', e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="State"><WInput value={employee.permanentAddressState || ''} onChange={e => handleInputChange('permanentAddressState', e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="PIN Code"><WInput value={employee.permanentAddressPin || ''} onChange={e => handleInputChange('permanentAddressPin', e.target.value)} disabled={isSaving}/></DataRow>
                                </Section>

                                <Section title="Guarantor Information">
                                    <DataRow label="Guarantor Name"><WInput value={employee.guarantorName || ''} onChange={e => handleInputChange('guarantorName', e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Guarantor Phone"><WInput value={employee.guarantorPhone || ''} onChange={e => handleInputChange('guarantorPhone', e.target.value)} disabled={isSaving}/></DataRow>
                                </Section>
                            </div>

                            <div className="col-span-1 space-y-6">
                                <div className="flex justify-center">
                                    <div className="relative w-40 h-48 border-2 border-dashed bg-gray-50 flex items-center justify-center text-gray-400 p-1">
                                        <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setProfilePictureFile, setProfilePicturePreview)} className="absolute w-full h-full opacity-0 cursor-pointer" disabled={isSaving}/>
                                        {profilePicturePreview ? <Image src={profilePicturePreview} alt="Profile Preview" width={160} height={192} className="object-cover w-full h-full"/> : <span>Passport Photo</span>}
                                    </div>
                                </div>
                                <Section title="Professional Details">
                                    <DataRow label="Position"><WInput value={employee.position || ''} onChange={e => handleInputChange('position', e.target.value)} required disabled={isSaving}/></DataRow>
                                    <DataRow label="UAN"><WInput value={employee.uan || ''} onChange={e => handleInputChange('uan', e.target.value)} disabled={isSaving} /></DataRow>
                                    <DataRow label="Joining Date"><WPopover date={employee.joiningDate} setDate={(d) => handleInputChange('joiningDate', d)} /></DataRow>
                                    <DataRow label="Experience"><WInput value={employee.experience || ''} onChange={e => handleInputChange('experience', e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Salary"><WInput type="number" value={employee.salary || ''} onChange={e => handleInputChange('salary', e.target.value)} required disabled={isSaving} placeholder={`${currencySymbol} Salary`}/></DataRow>
                                </Section>
                                <Section title="Physical Attributes">
                                    <DataRow label="Height"><WInput value={employee.height || ''} onChange={e => handleInputChange('height', e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Weight"><WInput value={employee.weight || ''} onChange={e => handleInputChange('weight', e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Identification Marks"><WInput value={employee.identificationMarks || ''} onChange={e => handleInputChange('identificationMarks', e.target.value)} disabled={isSaving}/></DataRow>
                                </Section>
                            </div>
                        </div>
                        
                        <footer className="mt-auto pt-6 border-t border-gray-300 grid grid-cols-3 gap-8 text-sm">
                             <div>
                                <p className="font-semibold text-gray-700">Left Thumb Impression</p>
                                <div className="relative w-24 h-24 mt-2 border border-dashed bg-gray-50 flex items-center justify-center">
                                    <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLeftThumbImpressionFile, setLeftThumbImpressionPreview)} className="absolute w-full h-full opacity-0 cursor-pointer" disabled={isSaving}/>
                                    {leftThumbImpressionPreview ? <Image src={leftThumbImpressionPreview} alt="Thumb Preview" width={96} height={96} className="object-contain"/> : <span className="text-xs text-gray-400">Thumb</span>}
                                </div>
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-700">Employee Signature</p>
                                <div className="relative w-48 h-24 mt-2 border border-dashed bg-gray-50 flex items-center justify-center p-2">
                                     <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setSignatureFile, setSignaturePreview)} className="absolute w-full h-full opacity-0 cursor-pointer" disabled={isSaving}/>
                                    {signaturePreview ? <Image src={signaturePreview} alt="Signature Preview" width={192} height={96} className="object-contain h-full w-full"/> : <span className="text-xs text-gray-400">Signature</span>}
                                </div>
                            </div>
                        </footer>
                    </div>
                </form>
            </main>
        </div>
    );
}

