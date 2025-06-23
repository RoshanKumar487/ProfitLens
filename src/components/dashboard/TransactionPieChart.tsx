
'use client'

import * as React from "react"
import Link from "next/link"
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { db } from "@/lib/firebaseConfig"
import { collectionGroup, query, where, getDocs } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Info, ArrowRight } from "lucide-react"

interface Transaction {
  id: string;
  category: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
}

const COLORS = [
  "hsl(var(--chart-1))", 
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))", 
  "hsl(var(--chart-4))", 
  "hsl(var(--chart-5))",
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8",
];

export default function TransactionPieChart() {
  const { user, currencySymbol } = useAuth();
  const [data, setData] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user || !user.companyId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      const q = query(
        collectionGroup(db, 'transactions'),
        where('companyId', '==', user.companyId),
        where('type', '==', 'withdrawal')
      );

      try {
        const snapshot = await getDocs(q);
        const transactions: Transaction[] = [];
        snapshot.forEach(doc => {
            transactions.push({ id: doc.id, ...doc.data() } as Transaction);
        });

        const categoryTotals = transactions.reduce((acc, tx) => {
            if (!acc[tx.category]) {
            acc[tx.category] = 0;
            }
            acc[tx.category] += tx.amount;
            return acc;
        }, {} as { [key: string]: number });

        const chartData = Object.entries(categoryTotals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        setData(chartData);
      } catch (error) {
          console.error("Error fetching transaction data for chart:", error);
      } finally {
          setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 text-sm bg-background/80 border rounded-md shadow-lg backdrop-blur-sm">
          <p className="font-bold">{`${payload[0].name}`}</p>
          <p className="text-foreground">{`Amount: ${currencySymbol}${payload[0].value.toFixed(2)}`}</p>
          <p className="text-muted-foreground">{`(${(payload[0].percent * 100).toFixed(0)}%)`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="font-headline">Expense Breakdown</CardTitle>
                <CardDescription>Withdrawals by category from your bank accounts.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="flex-shrink-0">
                <Link href="/bank-accounts">
                    Manage Accounts
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </div>
      </CardHeader>
      <CardContent className="h-[300px] sm:h-[350px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Alert className="border-primary/20 max-w-sm">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle>No Data Yet</AlertTitle>
              <p className="text-xs text-muted-foreground">Add bank accounts and log some withdrawal transactions to see your expense breakdown here.</p>
            </Alert>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                fill="hsl(var(--primary))"
                dataKey="value"
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
