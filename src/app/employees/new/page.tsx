
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
import { Users2, Loader2, Save, Camera, UploadCloud, XCircle, SwitchCamera, FileText, Fingerprint, PenSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/firebaseStorageUtils';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

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
    
    // Basic Info
    const [name, setName] = useState('');
    const [position, setPosition] = useState('');
    const [salary, setSalary] = useState('');
    const [description, setDescription] = useState('');
    
    // Bio-Data Fields
    const [tNo, setTNo] = useState('');
    const [ufSize, setUfSize] = useState('');
    const [shoesNo, setShoesNo] = useState('');
    const [fatherName, setFatherName] = useState('');
    const [wifeOrMotherName, setWifeOrMotherName] = useState('');
    const [presentAddressHNo, setPresentAddressHNo] = useState('');
    const [presentAddressPS, setPresentAddressPS] = useState('');
    const [presentAddressPost, setPresentAddressPost] = useState('');
    const [presentAddressDist, setPresentAddressDist] = useState('');
    const [presentAddressState, setPresentAddressState] = useState('');
    const [presentAddressPin, setPresentAddressPin] = useState('');
    const [phoneNo, setPhoneNo] = useState('');
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
    const [villagePresidentName, setVillagePresidentName] = useState('');

    // Files
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
    const [associatedFile, setAssociatedFile] = useState<File | null>(null);
    const [leftThumbImpressionFile, setLeftThumbImpressionFile] = useState<File | null>(null);
    const [leftThumbImpressionPreview, setLeftThumbImpressionPreview] = useState<string | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

    // Dragging State
    const [isDraggingProfile, setIsDraggingProfile] = useState(false);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    
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
        } finally {
            setIsSwitchingCamera(false);
        }
    }, [cleanupWebcam]);

    useEffect(() => {
        if (showProfileWebcam) {
            startWebcam(facingMode);
        } else {
            cleanupWebcam();
        }
        return () => cleanupWebcam();
    }, [showProfileWebcam, facingMode, startWebcam, cleanupWebcam]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>, setPreview?: React.Dispatch<React.SetStateAction<string | null>>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) { // 2MB limit for images
                toast({ title: "Image File Too Large", description: "Images must be less than 2MB.", variant: "destructive" });
                return;
            }
             if (!file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) { // 10MB for other files
                toast({ title: "File Too Large", description: "File must be less than 10MB.", variant: "destructive" });
                return;
            }
            setFile(file);
            if (setPreview) {
                setPreview(URL.createObjectURL(file));
            }
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

    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleProfileDragEnter = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingProfile(true); };
    const handleProfileDragLeave = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingProfile(false); };
    const handleProfileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        handleDragEvents(e);
        setIsDraggingProfile(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            setProfilePictureFile(file);
            setProfilePicturePreview(URL.createObjectURL(file));
        }
    };
    const handleFileDragEnter = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingFile(true); };
    const handleFileDragLeave = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingFile(false); };
    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingFile(false); handleFileChange(e.dataTransfer.files?.[0], setAssociatedFile); };

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

                tNo, ufSize, shoesNo, fatherName, wifeOrMotherName,
                presentAddressHNo, presentAddressPS, presentAddressPost, presentAddressDist, presentAddressState, presentAddressPin, phoneNo,
                permanentAddressHNo, permanentAddressPS, permanentAddressPost, permanentAddressDist, permanentAddressState, permanentAddressPin,
                qualification, selfPhoneNo,
                dateOfBirth: dateOfBirth ? Timestamp.fromDate(dateOfBirth) : null,
                joiningDate: joiningDate ? Timestamp.fromDate(joiningDate) : null,
                height, weight, identificationMarks, guarantorName, guarantorPhone, experience, villagePresidentName,
            };

            await setDoc(doc(db, 'employees', employeeDocId), dataToSave);

            toast({ title: "Employee Added", description: `${name} has been added to your team.` });
            router.push('/employees');
        } catch (error: any) {
            toast({ title: "Save Failed", description: error.message, variant: "destructive" });
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageTitle title="Add New Employee" subtitle="Enter the details for your new team member." icon={Users2} />
            <Card className="max-w-4xl mx-auto shadow-lg">
                <form onSubmit={handleSubmit}>
                    <CardContent className="p-6 space-y-6">

                        {/* Basic Info */}
                        <CardDescription>Basic Information</CardDescription>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><Label htmlFor="name">Full Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSaving} /></div>
                            <div><Label htmlFor="position">Position / Role</Label><Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} required disabled={isSaving} /></div>
                            <div><Label htmlFor="salary">Annual Salary ({currencySymbol})</Label><Input id="salary" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} required min="0" disabled={isSaving} /></div>
                        </div>

                        <Separator />
                        
                        {/* Bio-Data */}
                        <CardDescription>Bio-Data Details</CardDescription>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><Label>T.No</Label><Input value={tNo} onChange={e => setTNo(e.target.value)} disabled={isSaving}/></div>
                            <div><Label>UF Size</Label><Input value={ufSize} onChange={e => setUfSize(e.target.value)} disabled={isSaving}/></div>
                            <div><Label>Shoes No.</Label><Input value={shoesNo} onChange={e => setShoesNo(e.target.value)} disabled={isSaving}/></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label>Father's Name</Label><Input value={fatherName} onChange={e => setFatherName(e.target.value)} disabled={isSaving}/></div>
                            <div><Label>Wife or Mother's Name</Label><Input value={wifeOrMotherName} onChange={e => setWifeOrMotherName(e.target.value)} disabled={isSaving}/></div>
                        </div>
                        
                        <Separator />
                        <CardDescription>Present Address</CardDescription>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label>H.No / Street</Label><Input value={presentAddressHNo} onChange={e => setPresentAddressHNo(e.target.value)} disabled={isSaving}/></div>
                            <div><Label>Phone No.</Label><Input value={phoneNo} onChange={e => setPhoneNo(e.target.value)} disabled={isSaving}/></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><Label>Police Station (P.S.)</Label><Input value={presentAddressPS} onChange={e => setPresentAddressPS(e.target.value)} disabled={isSaving}/></div>
                            <div><Label>Post Office</Label><Input value={presentAddressPost} onChange={e => setPresentAddressPost(e.target.value)} disabled={isSaving}/></div>
                            <div><Label>District</Label><Input value={presentAddressDist} onChange={e => setPresentAddressDist(e.target.value)} disabled={isSaving}/></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label>State</Label><Input value={presentAddressState} onChange={e => setPresentAddressState(e.target.value)} disabled={isSaving}/></div>
                            <div><Label>PIN Code</Label><Input value={presentAddressPin} onChange={e => setPresentAddressPin(e.target.value)} disabled={isSaving}/></div>
                        </div>
                        
                        <Separator />
                        <CardDescription>Permanent Address</CardDescription>
                         <div><Label>H.No / Street</Label><Input value={permanentAddressHNo} onChange={e => setPermanentAddressHNo(e.target.value)} disabled={isSaving}/></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div><Label>Police Station (P.S.)</Label><Input value={permanentAddressPS} onChange={e => setPermanentAddressPS(e.target.value)} disabled={isSaving}/></div>
                           <div><Label>Post Office</Label><Input value={permanentAddressPost} onChange={e => setPermanentAddressPost(e.target.value)} disabled={isSaving}/></div>
                           <div><Label>District</Label><Input value={permanentAddressDist} onChange={e => setPermanentAddressDist(e.target.value)} disabled={isSaving}/></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div><Label>State</Label><Input value={permanentAddressState} onChange={e => setPermanentAddressState(e.target.value)} disabled={isSaving}/></div>
                           <div><Label>PIN Code</Label><Input value={permanentAddressPin} onChange={e => setPermanentAddressPin(e.target.value)} disabled={isSaving}/></div>
                        </div>
                        
                        <Separator />
                        <CardDescription>Other Details</CardDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label>Qualification</Label><Input value={qualification} onChange={e => setQualification(e.target.value)} disabled={isSaving}/></div>
                            <div><Label>Personal Phone No.</Label><Input value={selfPhoneNo} onChange={e => setSelfPhoneNo(e.target.value)} disabled={isSaving}/></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div><Label>Date of Birth</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}><CalendarIcon className="mr-2 h-4 w-4" />{dateOfBirth ? format(dateOfBirth, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateOfBirth} onSelect={setDateOfBirth} captionLayout="dropdown-buttons" fromYear={1950} toYear={new Date().getFullYear()} initialFocus /></PopoverContent></Popover></div>
                            <div><Label>Height</Label><Input value={height} onChange={e => setHeight(e.target.value)} disabled={isSaving}/></div>
                            <div><Label>Weight</Label><Input value={weight} onChange={e => setWeight(e.target.value)} disabled={isSaving}/></div>
                        </div>
                         <div><Label>Identification Marks</Label><Input value={identificationMarks} onChange={e => setIdentificationMarks(e.target.value)} disabled={isSaving}/></div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><Label>Joining Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSaving}><CalendarIcon className="mr-2 h-4 w-4" />{joiningDate ? format(joiningDate, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={joiningDate} onSelect={setJoiningDate} captionLayout="dropdown-buttons" fromYear={1980} toYear={new Date().getFullYear()} initialFocus /></PopoverContent></Popover></div>
                            <div><Label>Experience</Label><Input value={experience} onChange={e => setExperience(e.target.value)} disabled={isSaving}/></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div><Label>Guarantor Name</Label><Input value={guarantorName} onChange={e => setGuarantorName(e.target.value)} disabled={isSaving}/></div>
                           <div><Label>Guarantor Phone</Label><Input value={guarantorPhone} onChange={e => setGuarantorPhone(e.target.value)} disabled={isSaving}/></div>
                        </div>
                        <div><Label>Village President Name</Label><Input value={villagePresidentName} onChange={e => setVillagePresidentName(e.target.value)} disabled={isSaving}/></div>
                        
                        <Separator />
                        <CardDescription>File Uploads</CardDescription>

                         {/* Profile Picture */}
                        <div className="space-y-2">
                            <Label>Profile Picture (Optional)</Label>
                            <div className="flex items-start gap-4">
                                <Avatar className="h-24 w-24 flex-shrink-0"><AvatarImage src={profilePicturePreview || `https://placehold.co/96x96.png?text=${getInitials(name)}`} /><AvatarFallback>{getInitials(name)}</AvatarFallback></Avatar>
                                <div className="flex-grow space-y-2">
                                    <div onDrop={handleProfileDrop} onDragOver={handleDragEvents} onDragEnter={handleProfileDragEnter} onDragLeave={handleProfileDragLeave} className={cn("relative flex flex-col items-center justify-center w-full p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors", isDraggingProfile && "border-primary bg-primary/10")}>
                                        <UploadCloud className="h-6 w-6 text-muted-foreground"/><p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold text-primary">Click or drop image</span></p>
                                        <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setProfilePictureFile, setProfilePicturePreview)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isSaving || showProfileWebcam}/>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setShowProfileWebcam(p => !p)} disabled={isSaving} className="flex-1 text-xs"><Camera className="mr-1.5 h-3.5 w-3.5" /> {showProfileWebcam ? 'Close Cam' : 'Webcam'}</Button>
                                        {profilePicturePreview && <Button type="button" variant="ghost" size="sm" onClick={() => { setProfilePictureFile(null); setProfilePicturePreview(null); }} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 flex-1 text-xs"><XCircle className="mr-1.5 h-3.5 w-3.5" /> Remove</Button>}
                                    </div>
                                </div>
                            </div>
                            {showProfileWebcam && (
                                <div className="mt-2 space-y-2 p-2 border rounded-md bg-muted/30">
                                    <video ref={videoRef} className="w-full aspect-[4/3] rounded-md bg-black" autoPlay muted playsInline />
                                    {hasCameraPermission === false && <Alert variant="destructive" className="p-2 text-xs"><AlertTitle className="text-xs">Cam Access Denied</AlertTitle></Alert>}
                                    {hasCameraPermission === true && <div className="flex gap-2">{hasMultipleCameras && <Button type="button" onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="flex-1 h-9 text-xs" disabled={isSaving || isSwitchingCamera}>{isSwitchingCamera ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <SwitchCamera className="mr-1.5 h-3.5 w-3.5" />} {isSwitchingCamera ? 'Switching...' : 'Switch Cam'}</Button>}<Button type="button" onClick={handleCaptureProfilePhoto} className="flex-1 h-9 text-xs" disabled={isSaving || isSwitchingCamera}><Camera className="mr-1.5 h-3.5 w-3.5" /> Capture</Button></div>}
                                </div>
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                        
                         {/* Other File Uploads */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {/* Signature */}
                            <div className="space-y-2">
                                <Label>Signature (Optional)</Label>
                                <div className="w-full h-24 border-2 border-dashed rounded-lg flex items-center justify-center p-1">
                                    <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setSignatureFile, setSignaturePreview)} className="absolute w-full h-24 opacity-0 cursor-pointer" disabled={isSaving}/>
                                    {signaturePreview ? <Image src={signaturePreview} alt="Signature Preview" width={150} height={80} className="object-contain max-h-full"/> : <div className="text-center text-xs text-muted-foreground"><PenSquare className="mx-auto h-6 w-6"/><p>Upload Signature</p></div>}
                                </div>
                                {signaturePreview && <Button size="sm" variant="ghost" className="w-full text-destructive" type="button" onClick={() => {setSignatureFile(null); setSignaturePreview(null);}}>Remove</Button>}
                            </div>

                             {/* Thumb Impression */}
                            <div className="space-y-2">
                                <Label>Left Thumb Impression (Optional)</Label>
                                <div className="w-full h-24 border-2 border-dashed rounded-lg flex items-center justify-center p-1">
                                <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setLeftThumbImpressionFile, setLeftThumbImpressionPreview)} className="absolute w-full h-24 opacity-0 cursor-pointer" disabled={isSaving}/>
                                    {leftThumbImpressionPreview ? <Image src={leftThumbImpressionPreview} alt="Thumb Preview" width={150} height={80} className="object-contain max-h-full"/> : <div className="text-center text-xs text-muted-foreground"><Fingerprint className="mx-auto h-6 w-6"/><p>Upload Thumb Impression</p></div>}
                                </div>
                                 {leftThumbImpressionPreview && <Button size="sm" variant="ghost" className="w-full text-destructive" type="button" onClick={() => {setLeftThumbImpressionFile(null); setLeftThumbImpressionPreview(null);}}>Remove</Button>}
                            </div>

                            {/* Associated File */}
                             <div className="space-y-2">
                                <Label>Associated File (e.g., Resume)</Label>
                                <div onDrop={handleFileDrop} onDragOver={handleDragEvents} onDragEnter={handleFileDragEnter} onDragLeave={handleFileDragLeave} className={cn("relative flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors", isDraggingFile && "border-primary bg-primary/10")}>
                                    <FileText className="h-6 w-6 text-muted-foreground"/>
                                    <p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold text-primary">Click or drop file</span></p>
                                    <Input type="file" onChange={(e) => handleFileChange(e, setAssociatedFile)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isSaving}/>
                                </div>
                                {associatedFile && <div className="text-xs text-muted-foreground flex items-center justify-between p-1 bg-muted rounded-md"><span><span className="font-medium">{associatedFile.name}</span></span><Button type="button" variant="ghost" size="icon" onClick={() => setAssociatedFile(null)} className="text-destructive h-5 w-5"><XCircle className="h-4 w-4" /></Button></div>}
                            </div>
                        </div>

                        {/* Description */}
                        <div><Label htmlFor="description">Description / Notes (Optional)</Label><Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} disabled={isSaving} className="text-sm min-h-[60px]" /></div>
                    
                    </CardContent>
                    <CardHeader className="p-6 pt-0">
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" asChild type="button"><Link href="/employees">Cancel</Link></Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Add Employee
                            </Button>
                        </div>
                    </CardHeader>
                </form>
            </Card>
        </div>
    );
}
