
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { format, subMonths } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

import PageTitle from '@/components/PageTitle';
import DataCard from '@/components/DataCard';
import TransactionPieChart from '@/components/dashboard/TransactionPieChart';
import HelpfulTipsCard from '@/components/dashboard/HelpfulTipsCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, Wallet, LayoutDashboard } from 'lucide-react';

interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  employeeCount: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
}

interface RecentActivity {
  id: string;
  type: 'invoice' | 'expense';
  description: string;
  amount: number;
  date: Date;
  status?: string;
}

export default function DashboardPage() {
  const { user, currencySymbol, isLoading: authIsLoading } = useAuth();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.companyId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      const companyId = user.companyId;

      try {
        // Fetch financial data
        const revenueQuery = query(collection(db, 'revenueEntries'), where('companyId', '==', companyId));
        const expensesQuery = query(collection(db, 'expenses'), where('companyId', '==', companyId));
        const employeesQuery = query(collection(db, 'employees'), where('companyId', '==', companyId));
        const invoicesQuery = query(collection(db, 'invoices'), where('companyId', '==', companyId), orderBy('issuedDate', 'desc'), limit(3));
        const recentExpensesQuery = query(collection(db, 'expenses'), where('companyId', '==', companyId), orderBy('date', 'desc'), limit(3));

        const [revenueSnapshot, expensesSnapshot, employeesSnapshot, invoicesSnapshot, recentExpensesSnapshot] = await Promise.all([
          getDocs(revenueQuery),
          getDocs(expensesQuery),
          getDocs(employeesQuery),
          getDocs(invoicesSnapshot),
          getDocs(recentExpensesSnapshot),
        ]);

        let totalRevenue = 0;
        const revenueByMonth: { [key: string]: number } = {};
        revenueSnapshot.forEach(doc => {
          const data = doc.data();
          totalRevenue += data.amount;
          const month = format(data.date.toDate(), 'MMM yyyy');
          revenueByMonth[month] = (revenueByMonth[month] || 0) + data.amount;
        });

        let totalExpenses = 0;
        const expensesByMonth: { [key: string]: number } = {};
        expensesSnapshot.forEach(doc => {
          const data = doc.data();
          totalExpenses += data.amount;
          const month = format(data.date.toDate(), 'MMM yyyy');
          expensesByMonth[month] = (expensesByMonth[month] || 0) + data.amount;
        });

        const employeeCount = employeesSnapshot.size;
        const netProfit = totalRevenue - totalExpenses;

        setFinancialData({ totalRevenue, totalExpenses, netProfit, employeeCount });

        // Prepare chart data for the last 6 months
        const months = Array.from({ length: 6 }, (_, i) => format(subMonths(new Date(), i), 'MMM yyyy')).reverse();
        const chartData = months.map(month => ({
          month,
          revenue: revenueByMonth[month] || 0,
          expenses: expensesByMonth[month] || 0,
        }));
        setMonthlyChartData(chartData);
        
        // Prepare recent activity feed
        const invoiceActivities = invoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          type: 'invoice' as const,
          description: `Invoice #${doc.data().invoiceNumber} to ${doc.data().clientName}`,
          amount: doc.data().amount,
          date: (doc.data().issuedDate as Timestamp).toDate(),
          status: doc.data().status
        }));
        const expenseActivities = recentExpensesSnapshot.docs.map(doc => ({
            id: doc.id,
            type: 'expense' as const,
            description: doc.data().description || doc.data().category,
            amount: doc.data().amount,
            date: (doc.data().date as Timestamp).toDate(),
            status: 'Expense'
        }));
        
        const combinedActivities = [...invoiceActivities, ...expenseActivities]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 5);

        setRecentActivity(combinedActivities);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Expense':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };


  if (authIsLoading || (isLoading && !financialData)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <PageTitle title="Dashboard" icon={LayoutDashboard} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[126px]" />
          <Skeleton className="h-[126px]" />
          <Skeleton className="h-[126px]" />
          <Skeleton className="h-[126px]" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
            <Skeleton className="lg:col-span-2 h-[450px]" />
            <Skeleton className="lg:col-span-1 h-[450px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <PageTitle title="Dashboard" subtitle="An overview of your business's financial health." icon={LayoutDashboard} />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DataCard title="Total Revenue" value={`${currencySymbol}${financialData?.totalRevenue.toLocaleString() || '0'}`} icon={TrendingUp} trend="up" trendValue="+20.1% from last month" />
        <DataCard title="Total Expenses" value={`${currencySymbol}${financialData?.totalExpenses.toLocaleString() || '0'}`} icon={TrendingDown} trend="neutral" trendValue="+12% from last month" />
        <DataCard title="Net Profit" value={`${currencySymbol}${financialData?.netProfit.toLocaleString() || '0'}`} icon={Wallet} trend="up" trendValue="+15% from last month" />
        <DataCard title="Employees" value={`${financialData?.employeeCount.toLocaleString() || '0'}`} icon={Users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly overview for the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData}>
                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${currencySymbol}${value / 1000}k`} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                    }}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                />
                <Legend iconType="circle" iconSize={10} />
                <Bar dataKey="revenue" fill="hsl(var(--accent))" name="Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--primary))" name="Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <TransactionPieChart />
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-lg">
                <CardHeader>
                    <CardTitle className="font-headline">Recent Activity</CardTitle>
                    <CardDescription>Latest invoices and expenses recorded.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableCaption>{recentActivity.length === 0 ? "No recent activity." : "A list of your most recent transactions."}</TableCaption>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {recentActivity.map((activity) => (
                            <TableRow key={activity.id}>
                            <TableCell className="font-medium">{activity.description}</TableCell>
                            <TableCell>{format(activity.date, 'PP')}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className={getStatusBadgeVariant(activity.status)}>
                                    {activity.status}
                                </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${activity.type === 'invoice' ? 'text-accent' : 'text-destructive'}`}>
                                {activity.type === 'invoice' ? '+' : '-'}{currencySymbol}{activity.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <HelpfulTipsCard />
        </div>

    </div>
  );
}
