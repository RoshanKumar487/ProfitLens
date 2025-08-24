
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Save, User, Camera, UploadCloud, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import Image from 'next/image';
import { updateEmployee, getEmployeeById, uploadFile } from '../../actions';
import { EmployeeSchema, type EmployeeInput } from '@/lib/schemas';
import SignaturePad from '@/components/SignaturePad';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function EmployeeFormPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();

    const employeeId = params.id as string;
    const isEditMode = employeeId !== 'new';

    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSaving, setIsSaving] = useState(false);
    
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
    const [thumbImpressionFile, setThumbImpressionFile] = useState<File | null>(null);
    const [thumbImpressionPreview, setThumbImpressionPreview] = useState<string | null>(null);

    const form = useForm<EmployeeInput>({
        resolver: zodResolver(EmployeeSchema),
        defaultValues: { name: '', position: '', salary: 0 }
    });
    
    const fetchEmployeeData = useCallback(async () => {
        if (!isEditMode || !user?.companyId) return;
        setIsLoading(true);
        try {
            const employee = await getEmployeeById(employeeId, user.companyId);
            if (employee) {
                // Populate form with fetched data
                form.reset({
                    ...employee,
                    joiningDate: employee.joiningDate ? new Date(employee.joiningDate) : undefined,
                    dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth) : undefined,
                });
                if (employee.profilePictureUrl) setProfilePicturePreview(employee.profilePictureUrl);
                if (employee.signatureUrl) setSignaturePreview(employee.signatureUrl);
                if (employee.leftThumbImpressionUrl) setThumbImpressionPreview(employee.leftThumbImpressionUrl);
            } else {
                toast({ title: "Error", description: "Employee not found.", variant: "destructive" });
                router.push('/employees');
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to load employee data.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [isEditMode, employeeId, user?.companyId, router, toast, form]);

    useEffect(() => {
        if(isEditMode) {
            fetchEmployeeData();
        }
    }, [isEditMode, fetchEmployeeData]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>, setPreview: React.Dispatch<React.SetStateAction<string | null>>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };
    
    const dataURLtoFile = (dataurl: string, filename: string): File => {
        const arr = dataurl.split(',');
        if (arr.length < 2) throw new Error("Invalid data URL");
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch) throw new Error("Could not find MIME type");
        const mime = mimeMatch[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    };

    const handleSignatureSave = (dataUrl: string) => {
        const file = dataURLtoFile(dataUrl, `signature-${Date.now()}.png`);
        setSignatureFile(file);
        setSignaturePreview(dataUrl);
    };


    const onSubmit = async (data: EmployeeInput) => {
        if (!user?.companyId) {
            toast({ title: 'Error', description: 'Company context is missing.', variant: 'destructive' });
            return;
        }
        setIsSaving(true);
        try {
             // 1. Upload files and get URLs
            const uploadPromises = [
                profilePictureFile ? uploadFile(profilePictureFile, `employees/${employeeId || 'new'}/profile.jpg`, user.companyId) : Promise.resolve(profilePicturePreview),
                signatureFile ? uploadFile(signatureFile, `employees/${employeeId || 'new'}/signature.png`, user.companyId) : Promise.resolve(signaturePreview),
                thumbImpressionFile ? uploadFile(thumbImpressionFile, `employees/${employeeId || 'new'}/thumb.png`, user.companyId) : Promise.resolve(thumbImpressionPreview),
            ];

            const [profilePictureUrl, signatureUrl, leftThumbImpressionUrl] = await Promise.all(uploadPromises);

            const result = await updateEmployee(
                isEditMode ? employeeId : null,
                user.companyId,
                { ...data, profilePictureUrl, signatureUrl, leftThumbImpressionUrl }
            );

            if (result.success) {
                toast({ title: 'Success', description: `Employee ${isEditMode ? 'updated' : 'added'}.` });
                router.push('/employees');
            } else {
                toast({ title: 'Error', description: result.message, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Save Failed', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return (
             <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <PageTitle title={isEditMode ? "Edit Employee" : "Add New Employee"} icon={User} />
                <Card className="max-w-4xl mx-auto"><CardHeader><Skeleton className="h-6 w-1/4" /></CardHeader>
                <CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div></CardContent></Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageTitle title={isEditMode ? "Edit Employee" : "Add New Employee"} icon={User}>
                <Button variant="outline" asChild>
                    <Link href="/employees"><ArrowLeft className="mr-2 h-4 w-4" />Back to Employees</Link>
                </Button>
            </PageTitle>

            <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-4xl mx-auto">
                <Card className="mb-6">
                    <CardHeader><CardTitle>Identity</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="dateOfBirth"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date of Birth</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant="outline" className="pl-3 text-left font-normal"><>{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date('1930-01-01')} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="fatherName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Father's Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Richard Doe" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="motherName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mother's Name</FormLabel>
                                    <FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card className="mb-6">
                    <CardHeader><CardTitle>Professional Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="position" render={({ field }) => (<FormItem><FormLabel>Position / Role</FormLabel><FormControl><Input placeholder="e.g., Software Engineer" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="salary" render={({ field }) => (<FormItem><FormLabel>Salary (per month)</FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="joiningDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Joining Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="pl-3 text-left font-normal"><>{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="experience" render={({ field }) => (<FormItem><FormLabel>Previous Experience</FormLabel><FormControl><Input placeholder="e.g., 5 years at XYZ Corp" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="qualification" render={({ field }) => (<FormItem><FormLabel>Qualification</FormLabel><FormControl><Input placeholder="e.g., B.Tech in CS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                </Card>

                <Card className="mb-6">
                    <CardHeader><CardTitle>Contact & Address</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="selfPhoneNo" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="Employee's phone" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="md:col-span-2 space-y-4">
                           <h3 className="text-md font-semibold">Permanent Address</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField control={form.control} name="permanentAddressHNo" render={({ field }) => (<FormItem><FormLabel>House No / Village</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="permanentAddressPS" render={({ field }) => (<FormItem><FormLabel>Police Station</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="permanentAddressPost" render={({ field }) => (<FormItem><FormLabel>Post Office</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="permanentAddressDist" render={({ field }) => (<FormItem><FormLabel>District</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="permanentAddressState" render={({ field }) => (<FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="permanentAddressPin" render={({ field }) => (<FormItem><FormLabel>PIN Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="mb-6">
                    <CardHeader><CardTitle>Guarantor & Physical Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <FormField control={form.control} name="guarantorName" render={({ field }) => (<FormItem><FormLabel>Guarantor Name</FormLabel><FormControl><Input placeholder="Guarantor's full name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="guarantorPhone" render={({ field }) => (<FormItem><FormLabel>Guarantor Phone</FormLabel><FormControl><Input placeholder="Guarantor's phone number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="height" render={({ field }) => (<FormItem><FormLabel>Height</FormLabel><FormControl><Input placeholder="e.g., 5' 10&quot;" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="weight" render={({ field }) => (<FormItem><FormLabel>Weight</FormLabel><FormControl><Input placeholder="e.g., 75 kg" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="identificationMarks" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Identification Marks</FormLabel><FormControl><Input placeholder="e.g., Mole on right cheek" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </CardContent>
                </Card>

                <Card className="mb-6">
                    <CardHeader><CardTitle>Documents & Files</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>Passport Photo</Label>
                            <div className="w-full aspect-[3/4] border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground relative overflow-hidden">
                                {profilePicturePreview ? (<Image src={profilePicturePreview} alt="Profile preview" fill className="object-cover" />) : (<span>3 x 4</span>)}
                                <Input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, setProfilePictureFile, setProfilePicturePreview)} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label>Left Thumb Impression</Label>
                             <div className="w-full aspect-square border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground relative overflow-hidden">
                                {thumbImpressionPreview ? (<Image src={thumbImpressionPreview} alt="Thumb preview" fill className="object-contain p-2" />) : (<span>Thumb</span>)}
                                <Input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileChange(e, setThumbImpressionFile, setThumbImpressionPreview)} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label>Signature</Label>
                             <Dialog>
                                <DialogTrigger asChild>
                                   <div className="w-full aspect-video border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground relative overflow-hidden cursor-pointer">
                                        {signaturePreview ? (<Image src={signaturePreview} alt="Signature preview" fill className="object-contain p-2" />) : (<span>Signature</span>)}
                                    </div>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Draw Signature</DialogTitle><DialogDescription>Use your mouse or touchscreen to draw a signature.</DialogDescription></DialogHeader>
                                    <SignaturePad onSave={handleSignatureSave} isSaving={isSaving}/>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" asChild type="button"><Link href="/employees">Cancel</Link></Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isEditMode ? 'Save Changes' : 'Add Employee'}
                    </Button>
                </div>
            </form>
        </div>
    );
}

