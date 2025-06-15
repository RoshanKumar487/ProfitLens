
'use client';

import PageTitle from '@/components/PageTitle';
import DataCard from '@/components/DataCard';
import { DollarSign, TrendingUp, TrendingDown, Users, Activity, BarChartBig, FileText } from 'lucide-react'; // Removed Lightbulb as it's now in HelpfulTipsCard
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Added CardDescription
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, CartesianGrid } from 'recharts';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state


const mockChartData = [
  { name: 'Jan', revenue: 4000, expenses: 2400 },
  { name: 'Feb', revenue: 3000, expenses: 1398 },
  { name: 'Mar', revenue: 2000, expenses: 9800 },
  { name: 'Apr', revenue: 2780, expenses: 3908 },
  { name: 'May', revenue: 1890, expenses: 4800 },
  { name: 'Jun', revenue: 2390, expenses: 3800 },
];

const mockRecentActivity = [
  { id: 1, description: 'Invoice #INV001 paid', time: '2 hours ago', type: 'payment' },
  { id: 2, description: 'New expense "Office Supplies" recorded', time: '5 hours ago', type: 'expense' },
  { id: 3, description: 'Appointment with "Client X" scheduled', time: '1 day ago', type: 'calendar' },
];

const HelpfulTipsCardSkeleton = () => (
  <Card className="shadow-lg">
    <CardHeader>
      <Skeleton className="h-6 w-3/4 rounded" /> 
      <Skeleton className="h-4 w-1/2 rounded mt-1" /> 
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded-full" /> 
        <Skeleton className="h-4 flex-grow rounded" /> 
      </div>
      <div className="flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 flex-grow rounded" />
      </div>
      <div className="flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 flex-grow rounded" />
      </div>
      <Skeleton className="h-[200px] w-full rounded-lg mt-4" /> 
    </CardContent>
  </Card>
);

const HelpfulTipsCard = dynamic(() => import('@/components/dashboard/HelpfulTipsCard'), {
  loading: () => <HelpfulTipsCardSkeleton />,
});


export default function DashboardPage() {
  // Placeholder data
  const revenue = "$12,345.67";
  const expenses = "$5,678.90";
  const profit = "$6,666.77";
  const newCustomers = "12";
  const activeProjects = "5";

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageTitle title="Dashboard" subtitle="Overview of your business performance." icon={BarChartBig} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        <DataCard title="Total Revenue" value={revenue} icon={DollarSign} trend="up" trendValue="+15.2% from last month" className="bg-gradient-to-br from-green-50 to-green-100 border-green-300 dark:from-green-900/50 dark:to-green-950/50 dark:border-green-700" />
        <DataCard title="Total Expenses" value={expenses} icon={TrendingDown} trend="down" trendValue="-3.5% from last month" className="bg-gradient-to-br from-red-50 to-red-100 border-red-300 dark:from-red-900/50 dark:to-red-950/50 dark:border-red-700" />
        <DataCard title="Net Profit" value={profit} icon={TrendingUp} trend="up" trendValue="+20.1% from last month" className="bg-gradient-to-br from-green-50 to-green-100 border-green-300 dark:from-green-900/50 dark:to-green-950/50 dark:border-green-700" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
         <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly breakdown</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] sm:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `$${value/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend wrapperStyle={{fontSize: '12px'}} />
                <Bar dataKey="revenue" fill="hsl(var(--accent))" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--primary))" name="Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div>
                    <p className="text-sm text-muted-foreground">New Customers</p>
                    <p className="text-2xl font-bold">{newCustomers}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <div>
                    <p className="text-sm text-muted-foreground">Active Projects</p>
                    <p className="text-2xl font-bold">{activeProjects}</p>
                </div>
                <Activity className="h-8 w-8 text-accent" />
              </div>
               <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                 <div>
                    <p className="text-sm text-muted-foreground">Pending Invoices</p>
                    <p className="text-2xl font-bold">3</p>
                 </div>
                 <FileText className="h-8 w-8 text-destructive" />
              </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Recent Activity</CardTitle>
            <CardDescription>Latest updates and actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {mockRecentActivity.map(activity => (
                <li key={activity.id} className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                  <div className={`mt-1 flex-shrink-0 h-3 w-3 rounded-full ${activity.type === 'payment' ? 'bg-accent' : activity.type === 'expense' ? 'bg-destructive' : 'bg-primary'}`}></div>
                  <div>
                    <p className="text-sm text-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <HelpfulTipsCard />
      </div>
    </div>
  );
}
