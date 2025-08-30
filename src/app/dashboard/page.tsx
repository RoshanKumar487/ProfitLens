
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { format, subMonths } from 'date-fns';

import PageTitle from '@/components/PageTitle';
import DataCard from '@/components/DataCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Users, Wallet, LayoutDashboard } from 'lucide-react';
import type { MonthlyData } from '@/components/dashboard/RevenueVsExpensesChart';

const DynamicPieChart = dynamic(() => import('@/components/dashboard/TransactionPieChart'), {
  loading: () => <Skeleton className="h-[450px]" />,
  ssr: false,
});
const DynamicHelpfulTips = dynamic(() => import('@/components/dashboard/HelpfulTipsCard'), {
  loading: () => <Skeleton className="h-[460px]" />,
  ssr: false,
});
const DynamicRevenueVsExpensesChart = dynamic(() => import('@/components/dashboard/RevenueVsExpensesChart'), {
  loading: () => <div className="h-[350px]"><Skeleton className="h-full w-full" /></div>,
  ssr: false,
});


interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  employeeCount: number;
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
  const currencySymbol = '$'; // Mock currency symbol
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Removed all Firebase data fetching logic to prevent errors
    // after backend disconnection.
    setIsLoading(false);
    
    // Set mock data
    setFinancialData({
        totalRevenue: 50000,
        totalExpenses: 30000,
        netProfit: 20000,
        employeeCount: 5,
    });
    const mockChartData = Array.from({ length: 6 }, (_, i) => {
        const month = format(subMonths(new Date(), i), 'MMM yyyy');
        return {
            month,
            revenue: Math.random() * 10000 + 40000,
            expenses: Math.random() * 8000 + 20000,
        };
    }).reverse();
    setMonthlyChartData(mockChartData);
    
    setRecentActivity([
        { id: '1', type: 'invoice', description: 'Invoice #INV001 to Acme Corp', amount: 5000, date: new Date(), status: 'Paid'},
        { id: '2', type: 'expense', description: 'Office Supplies', amount: 150, date: new Date(), status: 'Expense'},
    ]);

  }, []);

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


  if (isLoading) {
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
        <DataCard title="Total Revenue" value={`${currencySymbol}${(financialData?.totalRevenue ?? 0).toLocaleString()}`} icon={TrendingUp} trend="up" trendValue="+20.1% from last month" className="bg-success-card" />
        <DataCard title="Total Expenses" value={`${currencySymbol}${(financialData?.totalExpenses ?? 0).toLocaleString()}`} icon={TrendingDown} trend="down" trendValue="+12% from last month" className="bg-danger-card" />
        <DataCard title="Net Profit" value={`${currencySymbol}${(financialData?.netProfit ?? 0).toLocaleString()}`} icon={Wallet} trend="up" trendValue="+15% from last month" className="bg-success-card" />
        <DataCard title="Employees" value={`${(financialData?.employeeCount ?? 0).toLocaleString()}`} icon={Users} className="bg-card" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly overview for the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <DynamicRevenueVsExpensesChart data={monthlyChartData} currencySymbol={currencySymbol} />
          </CardContent>
        </Card>

        <DynamicPieChart />
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
                            <TableCell className={`text-right font-semibold ${activity.type === 'invoice' ? 'text-chart-2' : 'text-destructive'}`}>
                                {activity.type === 'invoice' ? '+' : '-'}{currencySymbol}{activity.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <DynamicHelpfulTips />
        </div>

    </div>
  );
}
