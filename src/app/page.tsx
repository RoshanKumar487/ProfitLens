
'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  Landmark, CreditCard, Clock, Users, MoreVertical, ArrowUp, ArrowDown, Calendar, Bell, HelpCircle, LogOut, Building, CheckCircle, Edit, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Inline Components for the new dashboard

// Top-right header section
const DashboardHeader = () => {
  const { user, signOut } = useAuth();
  const getInitials = (name?: string | null) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

  return (
    <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Good morning, {user?.displayName?.split(' ')[0] || 'User'}!</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 rounded-full">
          <Calendar className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 rounded-full">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 rounded-full">
          <HelpCircle className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={`https://placehold.co/40x40.png`} data-ai-hint="person portrait" />
                <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link href="/company-details"><Building className="mr-2 h-4 w-4" />Company Details</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

// Stat Card for the top row
const StatCard = ({ icon: Icon, title, value }: { icon: LucideIcon; title: string; value: string; }) => (
  <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-card p-4">
    <div className="flex justify-between items-start">
        <div className="bg-primary/10 p-2 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 -mr-2 -mt-2">
            <MoreVertical className="h-4 w-4" />
        </Button>
    </div>
    <div className='mt-4'>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  </Card>
);

// Small Stat Card for the left column
const MiniStatCard = ({ title, value, change }: { title: string, value: string, change: string }) => (
  <Card className="rounded-2xl shadow-sm p-4 h-full">
    <p className="text-sm text-gray-500">{title}</p>
    <div className="flex items-baseline gap-4 mt-1">
      <p className="text-4xl font-bold">{value}</p>
      <div className={cn("flex items-center text-xs font-semibold", change.startsWith('+') ? 'text-green-500' : 'text-red-500')}>
        {change.startsWith('+') ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        <span>{change.slice(1)}</span>
      </div>
    </div>
  </Card>
);

// Revenue Chart
const revenueData = [
  { name: 'Feb 14', lastWeek: 15000, thisWeek: 16000 },
  { name: 'Feb 15', lastWeek: 16500, thisWeek: 16259 },
  { name: 'Feb 16', lastWeek: 14000, thisWeek: 12790 },
  { name: 'Feb 17', lastWeek: 17000, thisWeek: 15500 },
  { name: 'Feb 18', lastWeek: 18000, thisWeek: 17000 },
  { name: 'Feb 19', lastWeek: 16000, thisWeek: 18500 },
  { name: 'Feb 20', lastWeek: 17500, thisWeek: 19000 },
];
const RevenueChart = () => (
    <Card className="rounded-2xl shadow-sm h-full">
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="font-semibold">Revenue</CardTitle>
                <p className="text-xs text-gray-400">Last 7 days VS prior week</p>
            </div>
        </CardHeader>
        <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))"/>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => `${value / 1000}K`} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: 'var(--radius)',
                            color: 'hsl(var(--card-foreground))'
                        }}
                        itemStyle={{
                           color: 'hsl(var(--card-foreground))'
                        }}
                        labelStyle={{
                           fontWeight: 'bold'
                        }}
                     />
                    <Line type="monotone" dataKey="thisWeek" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="This Week"/>
                    <Line type="monotone" dataKey="lastWeek" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Last Week" />
                </LineChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
);

// Recent Emails
const emails = [
    { name: 'Hannah Morgan', subject: 'Meeting scheduled', time: '1:24 PM', avatar: 'https://placehold.co/40x40.png' },
    { name: 'Megan Clark', subject: 'Update on marketing campaign', time: '12:32 PM', avatar: 'https://placehold.co/40x40.png' },
    { name: 'Brandon Williams', subject: 'Designly 2.0 is about to launch', time: 'Yesterday', avatar: 'https://placehold.co/40x40.png' },
    { name: 'Reid Smith', subject: 'My friend Julie loves Dappr!', time: 'Yesterday', avatar: 'https://placehold.co/40x40.png' },
];
const RecentEmails = () => (
    <Card className="rounded-2xl shadow-sm">
        <CardHeader><CardTitle>Recent Emails</CardTitle></CardHeader>
        <CardContent>
            <ul className="space-y-4">
                {emails.map(email => (
                    <li key={email.name} className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={email.avatar} data-ai-hint="person portrait" />
                            <AvatarFallback>{email.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                            <p className="font-semibold">{email.name}</p>
                            <p className="text-sm text-gray-500">{email.subject}</p>
                        </div>
                        <p className="text-xs text-gray-400">{email.time}</p>
                    </li>
                ))}
            </ul>
        </CardContent>
    </Card>
);

// Right Sidebar Components
const FormationStatus = () => (
    <Card className="rounded-2xl bg-gray-900 text-white p-6">
        <p className="font-semibold">Formation status</p>
        <p className="text-sm text-gray-400 mt-2">In progress</p>
        <Progress value={66} className="mt-4 h-2 bg-gray-700 [&>div]:bg-white" />
        <div className="flex justify-between items-end mt-2">
            <div>
                <p className="text-sm text-gray-400">Estimated processing</p>
                <p className="text-lg font-semibold">4-5 business days</p>
            </div>
            <Button variant="secondary" className="bg-white text-gray-900 hover:bg-gray-200 h-auto px-4 py-2">View status</Button>
        </div>
    </Card>
);

const todoItems = [
    { icon: Edit, text: 'Run payroll', date: 'Mar 4 at 6:00 pm' },
    { icon: Clock, text: 'Review time off request', date: 'Mar 7 at 6:00 pm' },
    { icon: FileText, text: 'Sign board resolution', date: 'Mar 12 at 6:00 pm' },
    { icon: Users, text: 'Finish onboarding Tony', date: 'Mar 12 at 6:00 pm' },
];
const TodoList = () => (
    <div className="bg-card p-6 rounded-2xl shadow-sm">
        <h3 className="font-semibold text-lg">Your to-Do list</h3>
        <ul className="space-y-4 mt-4">
            {todoItems.map((item, index) => (
                <li key={index} className="flex items-center gap-4">
                    <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full">
                        <item.icon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div>
                        <p className="font-medium">{item.text}</p>
                        <p className="text-sm text-gray-500">{item.date}</p>
                    </div>
                </li>
            ))}
        </ul>
    </div>
);

const BoardMeeting = () => (
    <Card className="rounded-2xl bg-gray-900 text-white p-6">
        <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <p className="font-semibold">Board meeting</p>
        </div>
        <p className="text-sm text-gray-400 mt-1">Feb 22 at 6:00 PM</p>
        <p className="mt-4 text-gray-300">You have been invited to attend a meeting of the Board of Directors.</p>
    </Card>
);

// Main Dashboard Page
export default function DashboardPage() {
    return (
        <div className="p-4 sm:p-6 md:p-8">
            <DashboardHeader />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard icon={Landmark} title="Your bank balance" value="$143,624" />
                        <StatCard icon={Clock} title="Uncategorized" value="12" />
                        <StatCard icon={Users} title="Employees" value="7" />
                        <StatCard icon={CreditCard} title="Card spending" value="$3,287.49" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <MiniStatCard title="New clients" value="54" change="+18.7%" />
                            <MiniStatCard title="Invoices overdue" value="6" change="+2.7%" />
                        </div>
                        <div className="lg:col-span-2">
                           <RevenueChart />
                        </div>
                    </div>
                    <RecentEmails />
                </div>
                {/* Right sidebar */}
                <aside className="space-y-6">
                    <FormationStatus />
                    <TodoList />
                    <BoardMeeting />
                </aside>
            </div>
        </div>
    );
}
