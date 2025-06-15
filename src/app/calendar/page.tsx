
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageTitle from '@/components/PageTitle';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, PlusCircle, Clock, MapPin, Edit3, Trash2, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, Timestamp, serverTimestamp, orderBy } from 'firebase/firestore';

interface AppointmentFirestore {
  id?: string; // Firestore document ID
  date: Timestamp;
  title: string;
  time?: string;
  location?: string;
  notes?: string;
  companyId: string;
  createdAt?: Timestamp;
}

interface AppointmentDisplay {
  id: string; // Firestore document ID
  date: Date; // For display and form
  title: string;
  time?: string;
  location?: string;
  notes?: string;
}

export default function CalendarPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<AppointmentDisplay[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Partial<AppointmentDisplay & { id?: string }>>({});
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (authIsLoading) {
      setIsLoadingAppointments(true);
      return;
    }
    if (!user || !user.companyId) {
      setIsLoadingAppointments(false);
      setAppointments([]);
      console.log("Calendar: User or companyId not found for fetching appointments.");
      return;
    }

    setIsLoadingAppointments(true);
    try {
      const appointmentsRef = collection(db, 'appointments');
      const q = query(appointmentsRef, where('companyId', '==', user.companyId), orderBy('date', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedAppointments = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<AppointmentFirestore, 'id'>;
        return {
          id: docSnap.id,
          date: data.date.toDate(),
          title: data.title,
          time: data.time,
          location: data.location,
          notes: data.notes,
        };
      });
      setAppointments(fetchedAppointments);
      console.log("Calendar: Fetched", fetchedAppointments.length, "appointments for companyId:", user.companyId);
    } catch (error: any) {
      console.error('Error fetching appointments from Firestore:', error);
      toast({
        title: 'Error Loading Appointments',
        description: error.message || 'Could not load appointments from Firestore.',
        variant: 'destructive',
      });
      setAppointments([]);
    } finally {
      setIsLoadingAppointments(false);
    }
  }, [user, user?.companyId, authIsLoading, toast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
        setCurrentAppointment({ date, time: format(new Date(), "HH:mm") }); // Default time to current time
        setIsEditing(false);
        setIsFormOpen(true);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId) {
      toast({ title: "Authentication Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }
    if (!currentAppointment.title || !currentAppointment.date) {
      toast({ title: "Missing Information", description: "Title and date are required.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const appointmentDataToSave = {
      title: currentAppointment.title,
      date: Timestamp.fromDate(currentAppointment.date),
      time: currentAppointment.time,
      location: currentAppointment.location,
      notes: currentAppointment.notes,
      companyId: user.companyId,
    };

    try {
      if (isEditing && currentAppointment.id) {
        const appointmentRef = doc(db, 'appointments', currentAppointment.id);
        await updateDoc(appointmentRef, appointmentDataToSave);
        toast({ title: "Appointment Updated", description: `"${appointmentDataToSave.title}" has been updated.` });
      } else {
        await addDoc(collection(db, 'appointments'), { ...appointmentDataToSave, createdAt: serverTimestamp() });
        toast({ title: "Appointment Scheduled", description: `"${appointmentDataToSave.title}" has been added.` });
      }
      fetchAppointments(); // Refetch
      setIsFormOpen(false);
      setCurrentAppointment({});
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error saving appointment to Firestore:", error);
      toast({ title: "Save Failed", description: `Could not save appointment. ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditAppointment = (apt: AppointmentDisplay) => {
    setSelectedDate(apt.date); 
    setCurrentAppointment(apt);
    setIsEditing(true);
    setIsFormOpen(true);
  };
  
  const handleDeleteAppointment = async (id: string) => {
    setIsSaving(true); // Use general saving indicator
    try {
      const appointmentRef = doc(db, 'appointments', id);
      await deleteDoc(appointmentRef);
      toast({ title: "Appointment Deleted", description: "The appointment has been removed.", variant: "destructive" });
      fetchAppointments(); // Refetch
    } catch (error: any) {
      console.error("Error deleting appointment from Firestore:", error);
      toast({ title: "Delete Failed", description: `Could not delete appointment. ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const appointmentsForSelectedDate = selectedDate
    ? appointments.filter(
        (apt) => format(apt.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      )
    : [];
  
  const CustomDayContent = ({ date }: { date: Date }) => {
    const dayAppointments = appointments.filter(apt => format(apt.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
    if (dayAppointments.length > 0) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {format(date, 'd')}
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
            {dayAppointments.slice(0,3).map((_, i) => (
                 <span key={i} className="h-1 w-1 rounded-full bg-primary"></span>
            ))}
          </div>
        </div>
      );
    }
    return format(date, 'd');
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Calendar" subtitle="Manage your schedule and appointments." icon={CalendarDays}>
        <Button onClick={() => { 
            const today = new Date(); 
            setSelectedDate(today); 
            setCurrentAppointment({date: today, time: format(new Date(), "HH:mm")}); 
            setIsEditing(false); 
            setIsFormOpen(true); 
        }} disabled={isLoadingAppointments || isSaving}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Appointment
        </Button>
      </PageTitle>

      {isLoadingAppointments && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}

      {!isLoadingAppointments && (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 shadow-lg">
            <CardContent className="p-2 sm:p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md w-full"
                components={{ DayContent: CustomDayContent }}
                disabled={isSaving}
              />
            </CardContent>
          </Card>

          <Card className="md:col-span-1 shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
              </CardTitle>
              <CardDescription>
                {appointmentsForSelectedDate.length > 0
                  ? `${appointmentsForSelectedDate.length} appointment(s)`
                  : 'No appointments for this day.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {appointmentsForSelectedDate.length > 0 ? (
                appointmentsForSelectedDate.map((apt) => (
                  <div key={apt.id} className="p-3 bg-muted/50 rounded-lg border border-border transition-all hover:shadow-md">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-foreground">{apt.title}</h4>
                      <div className="flex gap-1">
                         <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditAppointment(apt)} disabled={isSaving}>
                           <Edit3 className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteAppointment(apt.id)} disabled={isSaving}>
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </div>
                    </div>
                    {apt.time && <p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/> {apt.time}</p>}
                    {apt.location && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/> {apt.location}</p>}
                    {apt.notes && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{apt.notes}</p>}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Select a day on the calendar to add an appointment, or view existing ones.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) { setCurrentAppointment({}); setIsEditing(false); }}}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{isEditing ? 'Edit Appointment' : 'Add New Appointment'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Update the details for your appointment.' : 'Fill in the details for your new appointment.'}
              {currentAppointment.date && ` For ${format(currentAppointment.date, 'MMMM d, yyyy')}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={currentAppointment.title || ''}
                onChange={(e) => setCurrentAppointment({ ...currentAppointment, title: e.target.value })}
                placeholder="e.g., Meeting with Client"
                required
                disabled={isSaving}
              />
            </div>
             <div>
              <Label htmlFor="time">Time (Optional)</Label>
              <Input
                id="time"
                type="time"
                value={currentAppointment.time || ''}
                onChange={(e) => setCurrentAppointment({ ...currentAppointment, time: e.target.value })}
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={currentAppointment.location || ''}
                onChange={(e) => setCurrentAppointment({ ...currentAppointment, location: e.target.value })}
                placeholder="e.g., Conference Room A / Zoom Link"
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={currentAppointment.notes || ''}
                onChange={(e) => setCurrentAppointment({ ...currentAppointment, notes: e.target.value })}
                placeholder="e.g., Discuss project proposal..."
                disabled={isSaving}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setCurrentAppointment({}); setIsEditing(false); }} disabled={isSaving}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? 'Save Changes' : 'Add Appointment')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
