
'use client';

import React, { useState, FormEvent, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { collection, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { uploadFileToStorage } from '@/lib/firebaseStorageUtils';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import Image from 'next/image';


const getInitials = (name: string = "") => {
  const names = name.split(' ');
  let initials = names[0] ? names[0][0] : '';
  if (names.length > 1 && names[names.length - 1]) {
    initials += names[names.length - 1][0];
  }
  return initials.toUpperCase();
};

export default function NewEmployeePage() {
    const { user, currencySymbol } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    // Form State
    const [isSaving, setIsSaving] = useState(false);
    
    // Form fields
    const [name, setName] = useState('');
    const [position, setPosition] = useState('');
    const [salary, setSalary] = useState('');
    const [description, setDescription] = useState('');
    const [fatherName, setFatherName] = useState('');
    const [motherName, setMotherName] = useState('');
    const [permanentAddressHNo, setPermanentAddressHNo] = useState('');
    const [permanentAddressPS, setPermanentAddressPS] = useState('');
    const [permanentAddressPost, setPermanentAddressPost] = useState('');
    const [permanentAddressDist, setPermanentAddressDist] = useState('');
    const [permanentAddressState, setPermanentAddressState] = useState('');
    const [permanentAddressPin, setPermanentAddressPin] = useState('');
    const [qualification, setQualification] = useState('');
    const [selfPhoneNo, setSelfPhoneNo] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState<Date>();
    const [joiningDate, setJoiningDate] = useState<Date>();
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [identificationMarks, setIdentificationMarks] = useState('');
    const [guarantorName, setGuarantorName] = useState('');
    const [guarantorPhone, setGuarantorPhone] = useState('');
    const [experience, setExperience] = useState('');

    // Files
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
    const [associatedFile, setAssociatedFile] = useState<File | null>(null);
    const [leftThumbImpressionFile, setLeftThumbImpressionFile] = useState<File | null>(null);
    const [leftThumbImpressionPreview, setLeftThumbImpressionPreview] = useState<string | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

    // Webcam state
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [showProfileWebcam, setShowProfileWebcam] = useState(false);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
    const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

    useEffect(() => {
        const checkForMultipleCameras = async () => {
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                setHasMultipleCameras(videoDevices.length > 1);
            }
        };
        checkForMultipleCameras();
    }, []);

    const cleanupWebcam = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }, []);

    const startWebcam = useCallback(async (mode: 'user' | 'environment') => {
        setIsSwitchingCamera(true);
        cleanupWebcam();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: mode } } });
            setHasCameraPermission(true);
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (error) {
            console.error("Camera error:", error);
            setHasCameraPermission(false);
            setShowProfileWebcam(false);
        } finally { setIsSwitchingCamera(false); }
    }, [cleanupWebcam]);

    useEffect(() => {
        if (showProfileWebcam) startWebcam(facingMode);
        else cleanupWebcam();
        return () => cleanupWebcam();
    }, [showProfileWebcam, facingMode, startWebcam, cleanupWebcam]);

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
    
    const handleCaptureProfilePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `capture.jpeg`, { type: 'image/jpeg' });
                setProfilePictureFile(file);
                setProfilePicturePreview(URL.createObjectURL(file));
            }
        }, 'image/jpeg', 0.9);
        setShowProfileWebcam(false);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !user.companyId) return toast({ title: "Authentication Error", variant: "destructive" });
        if (!name || !position || !salary) return toast({ title: "Missing Information", description: "Name, position, and salary are required.", variant: "destructive" });
        const salaryNum = Number(salary);
        if (isNaN(salaryNum) || salaryNum < 0) return toast({ title: "Invalid Salary", variant: "destructive"});

        setIsSaving(true);
        try {
            const employeeDocId = doc(collection(db, 'employees')).id;
            
            const upload = async (file: File | null, type: string) => {
                if (!file) return { url: '', path: '' };
                const path = `employees/${user.companyId}/${employeeDocId}/${type}.${file.name.split('.').pop()}`;
                const url = await uploadFileToStorage(file, path);
                return { url, path };
            };
            const [profilePic, assocFile, thumbFile, sigFile] = await Promise.all([
                upload(profilePictureFile, 'profileImage'),
                upload(associatedFile, 'associatedFile'),
                upload(leftThumbImpressionFile, 'thumbImpression'),
                upload(signatureFile, 'signature')
            ]);
            
            const dataToSave = {
                name, position, salary: salaryNum, description,
                companyId: user.companyId, addedById: user.uid, addedBy: user.displayName || user.email || 'System',
                createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
                profilePictureUrl: profilePic.url, profilePictureStoragePath: profilePic.path,
                associatedFileUrl: assocFile.url, associatedFileName: associatedFile?.name || '', associatedFileStoragePath: assocFile.path,
                leftThumbImpressionUrl: thumbFile.url, leftThumbImpressionStoragePath: thumbFile.path,
                signatureUrl: sigFile.url, signatureStoragePath: sigFile.path,
                fatherName, motherName,
                permanentAddressHNo, permanentAddressPS, permanentAddressPost, permanentAddressDist, permanentAddressState, permanentAddressPin,
                qualification, selfPhoneNo,
                dateOfBirth: dateOfBirth ? Timestamp.fromDate(dateOfBirth) : null,
                joiningDate: joiningDate ? Timestamp.fromDate(joiningDate) : null,
                height, weight, identificationMarks, guarantorName, guarantorPhone, experience,
            };
            await setDoc(doc(db, 'employees', employeeDocId), dataToSave);
            toast({ title: "Employee Added", description: `${name} has been added to your team.` });
            router.push('/employees');
        } catch (error: any) {
            toast({ title: "Save Failed", description: error.message, variant: "destructive" });
            setIsSaving(false);
        }
    };
    
    // WYSIWYG helper components
    const Section = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
      <div className={className}>
        <h3 className="text-sm font-bold text-gray-800 border-b-2 border-gray-400 pb-1 mb-3">{title}</h3>
        <div className="space-y-2">{children}</div>
      </div>
    );
    const DataRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
      <div className="grid grid-cols-[120px_1fr] items-center gap-x-2 text-xs">
        <Label className="text-gray-600 font-medium text-right">{label}:</Label>
        <div>{children}</div>
      </div>
    );
    const WInput = (props: React.ComponentProps<typeof Input>) => <Input className="h-6 text-xs p-1" {...props} />;
    const WPopover = ({date, setDate}: {date: Date | undefined, setDate: (d: Date | undefined) => void}) => (
        <Popover><PopoverTrigger asChild><Button variant="link" className="h-6 p-1 text-xs justify-start" disabled={isSaving}>{date ? format(date, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} captionLayout="dropdown-buttons" fromYear={1950} toYear={new Date().getFullYear()} initialFocus /></PopoverContent></Popover>
    );

    return (
        <div className="bg-muted min-h-screen">
            <header className="bg-background/80 border-b shadow-sm sticky top-14 sm:top-16 z-20 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-2">
                    <div className="flex items-center gap-2">
                         <Button variant="ghost" size="icon" className="h-8 w-8" asChild><Link href="/employees"><ArrowLeft className="h-4 w-4" /></Link></Button>
                        <h1 className="text-lg font-bold truncate">Add New Employee</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" asChild type="button"><Link href="/employees">Cancel</Link></Button>
                        <Button onClick={handleSubmit} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Employee
                        </Button>
                    </div>
                </div>
            </header>
            
            <main className="p-0 md:p-4 lg:p-8">
                <form onSubmit={handleSubmit}>
                    {/* Desktop WYSIWYG View */}
                    <div className="hidden md:block bg-white text-black font-sans w-[210mm] min-h-[297mm] mx-auto p-8 shadow-lg">
                        <header className="text-center mb-6">
                            <h1 className="text-3xl font-bold text-gray-800 uppercase tracking-wide">{user?.companyName || 'Company Name'}</h1>
                            <h2 className="text-2xl font-semibold text-gray-700 mt-4 pb-2 border-b-2 border-gray-300 text-center">Employee Bio-Data</h2>
                        </header>
                        
                        <div className="grid grid-cols-3 gap-8 pt-6">
                            <div className="col-span-2 space-y-6">
                                <Section title="Personal Details">
                                    <DataRow label="Full Name"><WInput value={name} onChange={e => setName(e.target.value)} required disabled={isSaving}/></DataRow>
                                    <DataRow label="Father's Name"><WInput value={fatherName} onChange={e => setFatherName(e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Mother's Name"><WInput value={motherName} onChange={e => setMotherName(e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Date of Birth"><WPopover date={dateOfBirth} setDate={setDateOfBirth} /></DataRow>
                                    <DataRow label="Phone Number"><WInput value={selfPhoneNo} onChange={e => setSelfPhoneNo(e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Qualification"><WInput value={qualification} onChange={e => setQualification(e.target.value)} disabled={isSaving}/></DataRow>
                                </Section>
                                
                                <Section title="Permanent Address">
                                    <DataRow label="H.No / Street"><WInput value={permanentAddressHNo} onChange={e => setPermanentAddressHNo(e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Police Station (P.S.)"><WInput value={permanentAddressPS} onChange={e => setPermanentAddressPS(e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Post Office"><WInput value={permanentAddressPost} onChange={e => setPermanentAddressPost(e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="District"><WInput value={permanentAddressDist} onChange={e => setPermanentAddressDist(e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="State"><WInput value={permanentAddressState} onChange={e => setPermanentAddressState(e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="PIN Code"><WInput value={permanentAddressPin} onChange={e => setPermanentAddressPin(e.target.value)} disabled={isSaving}/></DataRow>
                                </Section>

                                <Section title="Guarantor Information">
                                    <DataRow label="Guarantor Name"><WInput value={guarantorName} onChange={e => setGuarantorName(e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Guarantor Phone"><WInput value={guarantorPhone} onChange={e => setGuarantorPhone(e.target.value)} disabled={isSaving}/></DataRow>
                                </Section>
                            </div>

                            <div className="col-span-1 space-y-6">
                                <div className="flex justify-center">
                                    <div className="w-40 h-48 border-2 border-dashed bg-gray-50 flex items-center justify-center text-gray-400 p-1">
                                        <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setProfilePictureFile, setProfilePicturePreview)} className="absolute w-40 h-48 opacity-0 cursor-pointer" disabled={isSaving}/>
                                        {profilePicturePreview ? <Image src={profilePicturePreview} alt="Profile Preview" width={160} height={192} className="object-cover w-full h-full"/> : <span>Passport Photo</span>}
                                    </div>
                                </div>
                                <Section title="Professional Details">
                                    <DataRow label="Position"><WInput value={position} onChange={e => setPosition(e.target.value)} required disabled={isSaving}/></DataRow>
                                    <DataRow label="Joining Date"><WPopover date={joiningDate} setDate={setJoiningDate} /></DataRow>
                                    <DataRow label="Experience"><WInput value={experience} onChange={e => setExperience(e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Salary"><WInput type="number" value={salary} onChange={e => setSalary(e.target.value)} required disabled={isSaving} placeholder={`${currencySymbol} Annual`}/></DataRow>
                                </Section>
                                <Section title="Physical Attributes">
                                    <DataRow label="Height"><WInput value={height} onChange={e => setHeight(e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Weight"><WInput value={weight} onChange={e => setWeight(e.target.value)} disabled={isSaving}/></DataRow>
                                    <DataRow label="Identification Marks"><WInput value={identificationMarks} onChange={e => setIdentificationMarks(e.target.value)} disabled={isSaving}/></DataRow>
                                </Section>
                            </div>
                        </div>
                        
                        <footer className="mt-auto pt-6 border-t border-gray-300 grid grid-cols-3 gap-8 text-sm">
                             <div>
                                <p className="font-semibold text-gray-700">Left Thumb Impression</p>
                                <div className="w-24 h-24 mt-2 border border-dashed bg-gray-50 flex items-center justify-center">
                                    <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLeftThumbImpressionFile, setLeftThumbImpressionPreview)} className="absolute w-24 h-24 opacity-0 cursor-pointer" disabled={isSaving}/>
                                    {leftThumbImpressionPreview ? <Image src={leftThumbImpressionPreview} alt="Thumb Preview" width={96} height={96} className="object-contain"/> : <span className="text-xs text-gray-400">Thumb</span>}
                                </div>
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-700">Employee Signature</p>
                                <div className="w-48 h-24 mt-2 border border-dashed bg-gray-50 flex items-center justify-center p-2">
                                     <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setSignatureFile, setSignaturePreview)} className="absolute w-48 h-24 opacity-0 cursor-pointer" disabled={isSaving}/>
                                    {signaturePreview ? <Image src={signaturePreview} alt="Signature Preview" width={192} height={96} className="object-contain h-full w-full"/> : <span className="text-xs text-gray-400">Signature</span>}
                                </div>
                            </div>
                        </footer>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden p-4 space-y-4">
                        <Card>
                            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div><Label htmlFor="name">Full Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSaving} /></div>
                                <div><Label htmlFor="position">Position / Role</Label><Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} required disabled={isSaving} /></div>
                                <div><Label htmlFor="salary">Annual Salary ({currencySymbol})</Label><Input id="salary" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} required min="0" disabled={isSaving} /></div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Bio-Data Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div><Label>Father's Name</Label><Input value={fatherName} onChange={e => setFatherName(e.target.value)} disabled={isSaving}/></div>
                                <div><Label>Mother's Name</Label><Input value={motherName} onChange={e => setMotherName(e.target.value)} disabled={isSaving}/></div>
                                <Separator/>
                                <CardDescription>Permanent Address</CardDescription>
                                <div><Label>H.No / Street</Label><Input value={permanentAddressHNo} onChange={e => setPermanentAddressHNo(e.target.value)} disabled={isSaving}/></div>
                                <div><Label>Police Station (P.S.)</Label><Input value={permanentAddressPS} onChange={e => setPermanentAddressPS(e.target.value)} disabled={isSaving}/></div>
                                <div><Label>Post Office</Label><Input value={permanentAddressPost} onChange={e => setPermanentAddressPost(e.target.value)} disabled={isSaving}/></div>
                                <div><Label>District</Label><Input value={permanentAddressDist} onChange={e => setPermanentAddressDist(e.target.value)} disabled={isSaving}/></div>
                                <div><Label>State</Label><Input value={permanentAddressState} onChange={e => setPermanentAddressState(e.target.value)} disabled={isSaving}/></div>
                                <div><Label>PIN Code</Label><Input value={permanentAddressPin} onChange={e => setPermanentAddressPin(e.target.value)} disabled={isSaving}/></div>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader><CardTitle>Other Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div><Label>Qualification</Label><Input value={qualification} onChange={e => setQualification(e.target.value)} disabled={isSaving}/></div>
                                <div><Label>Personal Phone No.</Label><Input value={selfPhoneNo} onChange={e => setSelfPhoneNo(e.target.value)} disabled={isSaving}/></div>
                                <div><Label>Date of Birth</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}><CalendarIcon className="mr-2 h-4 w-4" />{dateOfBirth ? format(dateOfBirth, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateOfBirth} onSelect={setDateOfBirth} captionLayout="dropdown-buttons" fromYear={1950} toYear={new Date().getFullYear()} initialFocus /></PopoverContent></Popover></div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div><Label>Height</Label><Input value={height} onChange={e => setHeight(e.target.value)} disabled={isSaving}/></div>
                                  <div><Label>Weight</Label><Input value={weight} onChange={e => setWeight(e.target.value)} disabled={isSaving}/></div>
                                </div>
                                <div><Label>Identification Marks</Label><Input value={identificationMarks} onChange={e => setIdentificationMarks(e.target.value)} disabled={isSaving}/></div>
                                <div><Label>Joining Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}><CalendarIcon className="mr-2 h-4 w-4" />{joiningDate ? format(joiningDate, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={joiningDate} onSelect={setJoiningDate} captionLayout="dropdown-buttons" fromYear={1980} toYear={new Date().getFullYear()} initialFocus /></PopoverContent></Popover></div>
                                <div><Label>Experience</Label><Input value={experience} onChange={e => setExperience(e.target.value)} disabled={isSaving}/></div>
                                <div><Label>Guarantor Name</Label><Input value={guarantorName} onChange={e => setGuarantorName(e.target.value)} disabled={isSaving}/></div>
                                <div><Label>Guarantor Phone</Label><Input value={guarantorPhone} onChange={e => setGuarantorPhone(e.target.value)} disabled={isSaving}/></div>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>File Uploads</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                {/* Profile Picture */}
                                <div className="space-y-2">
                                    <Label>Profile Picture (Optional)</Label>
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-20 w-20"><AvatarImage src={profilePicturePreview || `https://placehold.co/80x80.png?text=${getInitials(name)}`} /><AvatarFallback>{getInitials(name)}</AvatarFallback></Avatar>
                                        <div className="flex-grow space-y-2">
                                            <Button type="button" variant="outline" size="sm" asChild className="w-full"><Label className="cursor-pointer"><UploadCloud className="mr-2 h-4 w-4"/>Upload Image <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setProfilePictureFile, setProfilePicturePreview)} className="hidden" disabled={isSaving || showProfileWebcam}/></Label></Button>
                                            <div className="flex gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => setShowProfileWebcam(p => !p)} disabled={isSaving} className="flex-1 text-xs"><Camera className="mr-1.5 h-3.5 w-3.5" /> {showProfileWebcam ? 'Close' : 'Webcam'}</Button>
                                                {profilePicturePreview && <Button type="button" variant="ghost" size="sm" onClick={() => { setProfilePictureFile(null); setProfilePicturePreview(null); }} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 flex-1 text-xs"><XCircle className="mr-1.5 h-3.5 w-3.5" /> Remove</Button>}
                                            </div>
                                        </div>
                                    </div>
                                    {showProfileWebcam && (<div className="mt-2 space-y-2 p-2 border rounded-md bg-muted/30"><video ref={videoRef} className="w-full aspect-[4/3] rounded-md bg-black" autoPlay muted playsInline /><div className="flex gap-2"><Button type="button" onClick={handleCaptureProfilePhoto} className="flex-1 h-9 text-xs" disabled={isSaving}><Camera className="mr-1.5 h-3.5 w-3.5" /> Capture</Button></div></div>)}
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                                {/* Other files */}
                                <div><Label>Signature (Optional)</Label><Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setSignatureFile, setSignaturePreview)} disabled={isSaving} />{signaturePreview && <div className="mt-2 p-2 border rounded-md inline-block bg-white"><Image src={signaturePreview} alt="Signature Preview" width={150} height={50} className="object-contain h-12" /></div>}</div>
                                <div><Label>Left Thumb Impression (Optional)</Label><Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLeftThumbImpressionFile, setLeftThumbImpressionPreview)} disabled={isSaving} />{leftThumbImpressionPreview && <div className="mt-2 p-2 border rounded-md inline-block bg-white"><Image src={leftThumbImpressionPreview} alt="Thumb Preview" width={80} height={80} className="object-contain h-20 w-20" /></div>}</div>
                                <div><Label>Associated File (e.g., Resume)</Label><Input type="file" onChange={(e) => handleFileChange(e, setAssociatedFile)} disabled={isSaving}/>{associatedFile && <div className="text-xs text-muted-foreground mt-1">{associatedFile.name}</div>}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Description / Notes</CardTitle></CardHeader>
                            <CardContent><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={isSaving}/></CardContent>
                        </Card>
                    </div>
                </form>
            </main>
        </div>
    );
}
