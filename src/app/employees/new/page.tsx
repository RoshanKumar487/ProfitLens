
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
import { Users2, Loader2, Save, Camera, UploadCloud, XCircle, SwitchCamera, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/firebaseStorageUtils';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

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

    const [name, setName] = useState('');
    const [position, setPosition] = useState('');
    const [salary, setSalary] = useState('');
    const [description, setDescription] = useState('');
    
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
    const [associatedFile, setAssociatedFile] = useState<File | null>(null);

    const [isSaving, setIsSaving] = useState(false);
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

    const resizeImage = (file: File, maxWidth: number = 800, targetSizeKB: number = 80): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = async () => {
                    let { width, height } = img;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject(new Error('Could not get canvas context.'));
                    ctx.drawImage(img, 0, 0, width, height);

                    let quality = 0.9;
                    const getBlob = (q: number): Promise<Blob | null> => new Promise(res => canvas.toBlob(b => res(b), 'image/jpeg', q));
                    let blob = await getBlob(quality);
                    while (blob && blob.size / 1024 > targetSizeKB && quality > 0.1) {
                        quality -= 0.15;
                        blob = await getBlob(quality);
                    }
                    if (blob) resolve(new File([blob], file.name.replace(/(\.[\w\d_-]+)$/i, '.jpeg'), { type: 'image/jpeg' }));
                    else reject(new Error('Canvas to Blob failed.'));
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleFileSelect = async (file: File | null, type: 'profile' | 'associated') => {
        if (!file) return;

        if (type === 'profile') {
            if (!file.type.startsWith('image/')) return toast({ title: "Invalid File Type", variant: "destructive"});
            if (file.size > 5 * 1024 * 1024) return toast({ title: "File Too Large", description: "Profile picture must be less than 5MB.", variant: "destructive"});
            
            setProfilePicturePreview(URL.createObjectURL(file));
            try {
                const resizedFile = await resizeImage(file);
                setProfilePictureFile(resizedFile);
            } catch (error) {
                console.error("Image resize error:", error);
                setProfilePictureFile(file);
            }
            if(showProfileWebcam) setShowProfileWebcam(false);
        } else {
            if (file.size > 10 * 1024 * 1024) return toast({ title: "File Too Large", description: "File must be less than 10MB.", variant: "destructive"});
            setAssociatedFile(file);
        }
    };
    
    const handleCaptureProfilePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        canvas.toBlob(async (blob) => {
            if (blob) {
                const file = new File([blob], `capture.jpeg`, { type: 'image/jpeg' });
                handleFileSelect(file, 'profile');
            }
        }, 'image/jpeg', 0.9);
        setShowProfileWebcam(false);
    };

    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleProfileDragEnter = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingProfile(true); };
    const handleProfileDragLeave = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingProfile(false); };
    const handleProfileDrop = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingProfile(false); handleFileSelect(e.dataTransfer.files?.[0], 'profile'); };
    const handleFileDragEnter = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingFile(true); };
    const handleFileDragLeave = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingFile(false); };
    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => { handleDragEvents(e); setIsDraggingFile(false); handleFileSelect(e.dataTransfer.files?.[0], 'associated'); };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !user.companyId) return toast({ title: "Authentication Error", variant: "destructive" });
        if (!name || !position || !salary) return toast({ title: "Missing Information", description: "Name, position, and salary are required.", variant: "destructive" });

        const salaryNum = Number(salary);
        if (isNaN(salaryNum) || salaryNum < 0) return toast({ title: "Invalid Salary", variant: "destructive"});

        setIsSaving(true);
        try {
            const employeeDocId = doc(collection(db, 'employees')).id;
            
            let profilePicUrl = '', profilePicPath = '';
            if (profilePictureFile) {
                const fileExtension = profilePictureFile.name.split('.').pop() || 'jpeg';
                profilePicPath = `employees/${user.companyId}/${employeeDocId}/profileImage.${fileExtension}`;
                profilePicUrl = await uploadFileToStorage(profilePictureFile, profilePicPath);
            }

            let assocFileUrl = '', assocFilePath = '', assocFileName = '';
            if (associatedFile) {
                assocFilePath = `employees/${user.companyId}/${employeeDocId}/associatedFiles/${associatedFile.name}`;
                assocFileUrl = await uploadFileToStorage(associatedFile, assocFilePath);
                assocFileName = associatedFile.name;
            }

            await setDoc(doc(db, 'employees', employeeDocId), {
                name, position, salary: salaryNum, description,
                profilePictureUrl: profilePicUrl,
                profilePictureStoragePath: profilePicPath,
                associatedFileUrl: assocFileUrl,
                associatedFileName: assocFileName,
                associatedFileStoragePath: assocFilePath,
                companyId: user.companyId,
                addedById: user.uid,
                addedBy: user.displayName || user.email || 'System',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

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
            <Card className="max-w-2xl mx-auto shadow-lg">
                <form onSubmit={handleSubmit}>
                    <CardContent className="p-6 space-y-4">
                        <div><Label htmlFor="name">Full Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={isSaving} /></div>
                        <div><Label htmlFor="position">Position / Role</Label><Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} required disabled={isSaving} /></div>
                        <div><Label htmlFor="salary">Annual Salary ({currencySymbol})</Label><Input id="salary" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} required min="0" disabled={isSaving} /></div>
                        
                        <div className="space-y-2 pt-2 border-t">
                            <Label>Profile Picture</Label>
                            <div className="flex items-start gap-3">
                                <Avatar className="h-20 w-20 flex-shrink-0"><AvatarImage src={profilePicturePreview || `https://placehold.co/80x80.png?text=${getInitials(name)}`} /><AvatarFallback>{getInitials(name)}</AvatarFallback></Avatar>
                                <div className="flex-grow space-y-1.5">
                                    <div onDrop={handleProfileDrop} onDragOver={handleDragEvents} onDragEnter={handleProfileDragEnter} onDragLeave={handleProfileDragLeave} className={cn("relative flex flex-col items-center justify-center w-full p-2 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors", isDraggingProfile && "border-primary bg-primary/10")}>
                                        <UploadCloud className="h-6 w-6 text-muted-foreground"/><p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold text-primary">Click or drop image</span></p>
                                        <Input id="profilePictureFile" type="file" accept="image/*" onChange={(e) => handleFileSelect(e.target.files?.[0], 'profile')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isSaving || showProfileWebcam}/>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setShowProfileWebcam(p => !p)} disabled={isSaving} className="flex-1 text-xs"><Camera className="mr-1.5 h-3.5 w-3.5" /> {showProfileWebcam ? 'Close Cam' : 'Webcam'}</Button>
                                        {profilePicturePreview && <Button type="button" variant="ghost" size="sm" onClick={() => { setProfilePictureFile(null); setProfilePicturePreview(null); }} className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 flex-1 text-xs"><XCircle className="mr-1.5 h-3.5 w-3.5" /> Remove</Button>}
                                    </div>
                                </div>
                            </div>
                            {showProfileWebcam && (
                                <div className="mt-1.5 space-y-1.5 p-2 border rounded-md bg-muted/30">
                                    <video ref={videoRef} className="w-full aspect-[4/3] rounded-md bg-black" autoPlay muted playsInline />
                                    {hasCameraPermission === false && <Alert variant="destructive" className="p-2 text-xs"><AlertTitle className="text-xs">Cam Access Denied</AlertTitle></Alert>}
                                    {hasCameraPermission === true && <div className="flex gap-2">{hasMultipleCameras && <Button type="button" onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="flex-1 h-9 text-xs" disabled={isSaving || isSwitchingCamera}>{isSwitchingCamera ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <SwitchCamera className="mr-1.5 h-3.5 w-3.5" />} {isSwitchingCamera ? 'Switching...' : 'Switch Cam'}</Button>}<Button type="button" onClick={handleCaptureProfilePhoto} className="flex-1 h-9 text-xs" disabled={isSaving || isSwitchingCamera}><Camera className="mr-1.5 h-3.5 w-3.5" /> Capture</Button></div>}
                                </div>
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>
                        
                        <div className="space-y-1.5 pt-2 border-t">
                            <Label htmlFor="associatedFile">Associated File (e.g., Resume)</Label>
                            <div onDrop={handleFileDrop} onDragOver={handleDragEvents} onDragEnter={handleFileDragEnter} onDragLeave={handleFileDragLeave} className={cn("relative flex flex-col items-center justify-center w-full p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors", isDraggingFile && "border-primary bg-primary/10")}>
                                <UploadCloud className="h-8 w-8 text-muted-foreground"/><p className="mt-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p><p className="text-xs text-muted-foreground">PDF, DOCX, etc. (Max 10MB)</p>
                                <Input id="associatedFile" type="file" onChange={(e) => handleFileSelect(e.target.files?.[0], 'associated')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isSaving}/>
                            </div>
                            {associatedFile && <div className="text-xs text-muted-foreground flex items-center justify-between p-2 bg-muted rounded-md"><span>Selected: <span className="font-medium">{associatedFile.name}</span></span><Button type="button" variant="ghost" size="icon" onClick={() => setAssociatedFile(null)} className="text-destructive h-6 w-6"><XCircle className="h-4 w-4" /></Button></div>}
                        </div>

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

    