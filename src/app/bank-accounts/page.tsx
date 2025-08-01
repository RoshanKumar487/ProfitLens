
'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Banknote, PlusCircle, Edit, Info, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const MOCK_ACCOUNTS = [
    { id: 'acc1', bankName: 'Global Bank', accountNumberLast4: '1234', balance: 50250.75, accountType: 'checking' as const },
    { id: 'acc2', bankName: 'National Savings', accountNumberLast4: '5678', balance: 125000.00, accountType: 'savings' as const },
];

const MOCK_TRANSACTIONS = [
    { id: 'tx1', date: 'Jul 20, 2024', description: 'Monthly Server Costs', category: 'Software', amount: 150.00, type: 'withdrawal' as const },
    { id: 'tx2', date: 'Jul 19, 2024', description: 'Client Payment', category: 'Sales', amount: 5000.00, type: 'deposit' as const },
];

export default function BankAccountsPage() {
  const { user, currencySymbol } = useAuth();
  const { toast } = useToast();

  const handleAction = () => {
    toast({ title: "Action Disabled", description: "Cannot perform this action without a backend connection.", variant: "destructive"});
  };
  
  if (!user) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <PageTitle title="Bank Accounts" icon={Banknote} />
        <Card><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>Please sign in to manage bank accounts.</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Bank Accounts" subtitle="Manage your accounts and track transactions." icon={Banknote}>
        <Button onClick={handleAction}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Account
        </Button>
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
            <Card>
                <CardHeader><CardTitle>Your Accounts</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-2">
                    {MOCK_ACCOUNTS.map(account => (
                        <div key={account.id} className="p-3 rounded-lg border bg-primary/10 border-primary">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold flex items-center gap-2"><Landmark className="h-4 w-4 text-muted-foreground" /> {account.bankName}</p>
                                    <p className="text-xs text-muted-foreground">•••• {account.accountNumberLast4}</p>
                                </div>
                                <p className="text-lg font-bold">{currencySymbol}{account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                 <Badge variant="outline" className="capitalize">{account.accountType}</Badge>
                                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAction}><Edit className="h-3 w-3" /></Button>
                            </div>
                        </div>
                    ))}
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2">
            <Card className="min-h-[400px]">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Transactions</CardTitle>
                            <CardDescription>For Global Bank</CardDescription>
                        </div>
                        <Button onClick={handleAction} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Transaction</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableCaption>A list of recent transactions.</TableCaption>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_TRANSACTIONS.map(tx => (
                                <TableRow key={tx.id}>
                                    <TableCell>{tx.date}</TableCell>
                                    <TableCell className="font-medium">{tx.description}</TableCell>
                                    <TableCell><Badge variant="secondary">{tx.category}</Badge></TableCell>
                                    <TableCell className={cn("text-right font-semibold", tx.type === 'deposit' ? 'text-green-600' : 'text-red-600')}>
                                        {tx.type === 'deposit' ? '+' : '-'}{currencySymbol}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
