
'use client';

import React, { useState, useEffect } from 'react';
import PageTitle from '@/components/PageTitle';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, PlusCircle, Clock, MapPin, Edit3, Trash2 } from 'lucide-react';
import { format, addHours, parseISO } from 'date-fns';
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

interface Appointment {
  id: string;
  date: Date;
  title: string;
  time?: string;
  location?: string;
  notes?: string;
}

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Partial<Appointment>>({});
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  // Load appointments from localStorage on mount
  useEffect(() => {
    const storedAppointments = localStorage.getItem('bizsight-appointments');
    if (storedAppointments) {
      setAppointments(JSON.parse(storedAppointments).map((apt: Appointment) => ({...apt, date: parseISO(apt.date as unknown as string)})));
    }
  }, []);

  // Save appointments to localStorage whenever they change
  useEffect(() => {
    if (appointments.length > 0 || localStorage.getItem('bizsight-appointments')) { // Only save if there are appointments or if it was previously saved
        localStorage.setItem('bizsight-appointments', JSON.stringify(appointments));
    }
  }, [appointments]);


  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) { // Only open form if a date is actually selected
        setCurrentAppointment({ date });
        setIsEditing(false);
        setIsFormOpen(true);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAppointment.title || !currentAppointment.date) return; // Ensure date is from currentAppointment

    const newAppointment: Appointment = {
      id: isEditing && currentAppointment.id ? currentAppointment.id : crypto.randomUUID(),
      date: currentAppointment.date, // Use date from currentAppointment
      title: currentAppointment.title || 'Unnamed Event',
      time: currentAppointment.time,
      location: currentAppointment.location,
      notes: currentAppointment.notes,
    };

    if (isEditing) {
      setAppointments(appointments.map(apt => apt.id === newAppointment.id ? newAppointment : apt));
      toast({ title: "Appointment Updated", description: `"${newAppointment.title}" has been updated.` });
    } else {
      setAppointments([...appointments, newAppointment]);
      toast({ title: "Appointment Scheduled", description: `"${newAppointment.title}" has been added to your calendar.` });
    }
    
    setIsFormOpen(false);
    setCurrentAppointment({});
    setIsEditing(false);
  };

  const handleEditAppointment = (apt: Appointment) => {
    setSelectedDate(apt.date); // Keep selectedDate in sync
    setCurrentAppointment(apt);
    setIsEditing(true);
    setIsFormOpen(true);
  };
  
  const handleDeleteAppointment = (id: string) => {
    setAppointments(appointments.filter(apt => apt.id !== id));
    toast({ title: "Appointment Deleted", description: "The appointment has been removed.", variant: "destructive" });
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
            setCurrentAppointment({date: today}); 
            setIsEditing(false); 
            setIsFormOpen(true); 
        }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Appointment
        </Button>
      </PageTitle>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-lg">
          <CardContent className="p-2 sm:p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              className="rounded-md w-full"
              components={{ DayContent: CustomDayContent }}
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
                       <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditAppointment(apt)}>
                         <Edit3 className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteAppointment(apt.id)}>
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
              />
            </div>
             <div>
              <Label htmlFor="time">Time (Optional)</Label>
              <Input
                id="time"
                type="time"
                value={currentAppointment.time || ''}
                onChange={(e) => setCurrentAppointment({ ...currentAppointment, time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                id="location"
                value={currentAppointment.location || ''}
                onChange={(e) => setCurrentAppointment({ ...currentAppointment, location: e.target.value })}
                placeholder="e.g., Conference Room A / Zoom Link"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={currentAppointment.notes || ''}
                onChange={(e) => setCurrentAppointment({ ...currentAppointment, notes: e.target.value })}
                placeholder="e.g., Discuss project proposal..."
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); setCurrentAppointment({}); setIsEditing(false); }}>Cancel</Button>
              </DialogClose>
              <Button type="submit">{isEditing ? 'Save Changes' : 'Add Appointment'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
