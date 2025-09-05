
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Banknote, PlusCircle, Landmark, Edit, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { getBankAccounts, addBankAccount, getTransactionsForAccount, addTransaction } from './actions';
import type { BankAccountDisplay, TransactionDisplay, BankAccount, Transaction } from './actions';
import { Skeleton } from '@/components/ui/skeleton';

export default function BankAccountsPage() {
  const { user, currencySymbol, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<BankAccountDisplay[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccountDisplay | null>(null);
  const [transactions, setTransactions] = useState<TransactionDisplay[]>([]);
  
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);

  // New Account Form State
  const [newBankName, setNewBankName] = useState('');
  const [newAccountType, setNewAccountType] = useState<'checking' | 'savings' | 'credit'>('checking');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newBalance, setNewBalance] = useState('');

  // New Transaction Form State
  const [newTxDate, setNewTxDate] = useState<Date|undefined>(new Date());
  const [newTxDesc, setNewTxDesc] = useState('');
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxType, setNewTxType] = useState<'deposit' | 'withdrawal'>('withdrawal');
  const [newTxCategory, setNewTxCategory] = useState('');

  const fetchAccounts = useCallback(async () => {
    if (!user) return;
    setIsLoadingAccounts(true);
    try {
      const fetchedAccounts = await getBankAccounts();
      setAccounts(fetchedAccounts);
      if (fetchedAccounts.length > 0 && !selectedAccount) {
        setSelectedAccount(fetchedAccounts[0]);
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not fetch bank accounts.", variant: "destructive" });
    } finally {
      setIsLoadingAccounts(false);
    }
  }, [user, selectedAccount, toast]);

  useEffect(() => {
    if (!authIsLoading) {
      fetchAccounts();
    }
  }, [authIsLoading, fetchAccounts]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!selectedAccount) {
        setTransactions([]);
        return;
      }
      setIsLoadingTransactions(true);
      try {
        const fetchedTransactions = await getTransactionsForAccount(selectedAccount.id);
        setTransactions(fetchedTransactions);
      } catch (error) {
        toast({ title: "Error", description: "Could not fetch transactions.", variant: "destructive" });
      } finally {
        setIsLoadingTransactions(false);
      }
    };
    fetchTransactions();
  }, [selectedAccount, toast]);

  const handleAddAccount = async () => {
    const balanceNum = parseFloat(newBalance);
    if (!newBankName || !newAccountNumber || isNaN(balanceNum)) {
        toast({ title: "Invalid Input", description: "Please fill all fields correctly.", variant: "destructive" });
        return;
    }
    
    setIsSaving(true);
    const newAccount: BankAccount = {
        bankName: newBankName,
        accountType: newAccountType,
        accountNumberLast4: newAccountNumber.slice(-4),
        balance: balanceNum
    };
    
    const result = await addBankAccount(newAccount);
    if (result.success) {
        toast({ title: "Success", description: "Bank account added." });
        fetchAccounts();
        setIsAddAccountOpen(false);
        setNewBankName(''); setNewAccountType('checking'); setNewAccountNumber(''); setNewBalance('');
    } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsSaving(false);
  };
  
  const handleAddTransaction = async () => {
    const amountNum = parseFloat(newTxAmount);
    if (!selectedAccount || !newTxDate || !newTxDesc || !newTxCategory || isNaN(amountNum) || amountNum <= 0) {
        toast({ title: "Invalid Input", description: "Please fill all transaction fields.", variant: "destructive" });
        return;
    }
    
    setIsSaving(true);
    const newTx: Transaction = {
        accountId: selectedAccount.id,
        date: newTxDate,
        description: newTxDesc,
        category: newTxCategory,
        amount: amountNum,
        type: newTxType
    };

    const result = await addTransaction(newTx);
    if (result.success) {
        toast({ title: "Success", description: "Transaction added." });
        fetchAccounts(); // To refetch accounts and update balance
        setIsAddTxOpen(false);
        setNewTxDate(new Date()); setNewTxDesc(''); setNewTxAmount(''); setNewTxCategory('');
    } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setIsSaving(false);
  };


  if (authIsLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <PageTitle title="Bank Accounts" icon={Banknote} />
         <div className="flex items-center justify-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Bank Accounts" subtitle="Manage your accounts and track transactions." icon={Banknote}>
        <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
          <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Add Account</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Add New Bank Account</DialogTitle><DialogDescription>Enter the details for your new bank account.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label htmlFor="bankName">Bank Name</Label><Input id="bankName" value={newBankName} onChange={e => setNewBankName(e.target.value)} placeholder="e.g., Global Bank" /></div>
              <div className="space-y-2"><Label htmlFor="accType">Account Type</Label><Select value={newAccountType} onValueChange={(v) => setNewAccountType(v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="checking">Checking</SelectItem><SelectItem value="savings">Savings</SelectItem><SelectItem value="credit">Credit Card</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="accNum">Account Number</Label><Input id="accNum" value={newAccountNumber} onChange={e => setNewAccountNumber(e.target.value)} placeholder="Enter full account number"/></div>
              <div className="space-y-2"><Label htmlFor="balance">Current Balance ({currencySymbol})</Label><Input id="balance" type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} placeholder="e.g., 5000.00"/></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsAddAccountOpen(false)}>Cancel</Button><Button onClick={handleAddAccount} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Add Account</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
            <Card>
                <CardHeader><CardTitle>Your Accounts</CardTitle></CardHeader>
                <CardContent>
                    {isLoadingAccounts ? (
                      <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full"/>)}</div>
                    ) : accounts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No accounts added yet.</p>
                    ) : (
                      <div className="space-y-2">
                          {accounts.map(account => (
                              <button key={account.id} className={cn("w-full text-left p-3 rounded-lg border transition-all", selectedAccount?.id === account.id ? "bg-primary/10 border-primary shadow-lg" : "hover:bg-muted/50")} onClick={() => setSelectedAccount(account)}>
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <p className="font-semibold flex items-center gap-2"><Landmark className="h-4 w-4 text-muted-foreground" /> {account.bankName}</p>
                                          <p className="text-xs text-muted-foreground">•••• {account.accountNumberLast4}</p>
                                      </div>
                                      <p className="text-lg font-bold">{currencySymbol}{account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                  </div>
                                  <div className="flex justify-between items-center mt-2">
                                      <Badge variant="outline" className="capitalize">{account.accountType}</Badge>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" disabled><Edit className="h-3 w-3" /></Button>
                                  </div>
                              </button>
                          ))}
                      </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2">
            <Card className="min-h-[400px]">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Transactions</CardTitle>
                            <CardDescription>For {selectedAccount ? selectedAccount.bankName : '...'}</CardDescription>
                        </div>
                        <Dialog open={isAddTxOpen} onOpenChange={setIsAddTxOpen}>
                            <DialogTrigger asChild><Button size="sm" disabled={!selectedAccount}><PlusCircle className="mr-2 h-4 w-4" /> Add Transaction</Button></DialogTrigger>
                            <DialogContent><DialogHeader><DialogTitle>New Transaction</DialogTitle><DialogDescription>Log a new transaction for {selectedAccount?.bankName}.</DialogDescription></DialogHeader>
                                <div className="space-y-4 py-2">
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2"><Label>Date</Label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarIcon className="mr-2 h-4 w-4"/>{newTxDate ? format(newTxDate, "PPP") : "Pick a date"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newTxDate} onSelect={setNewTxDate}/></PopoverContent></Popover></div>
                                      <div className="space-y-2"><Label>Type</Label><Select value={newTxType} onValueChange={v => setNewTxType(v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="withdrawal">Withdrawal</SelectItem><SelectItem value="deposit">Deposit</SelectItem></SelectContent></Select></div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Amount ({currencySymbol})</Label><Input type="number" value={newTxAmount} onChange={e => setNewTxAmount(e.target.value)}/></div>
                                    <div className="space-y-2"><Label>Category</Label><Input value={newTxCategory} onChange={e => setNewTxCategory(e.target.value)} placeholder="e.g., Groceries"/></div>
                                  </div>
                                  <div className="space-y-2"><Label>Description</Label><Input value={newTxDesc} onChange={e => setNewTxDesc(e.target.value)} placeholder="Transaction details"/></div>
                                </div>
                            <DialogFooter><Button variant="outline" onClick={() => setIsAddTxOpen(false)}>Cancel</Button><Button onClick={handleAddTransaction} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Transaction</Button></DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableCaption>{isLoadingTransactions ? "Loading transactions..." : (transactions.length === 0 ? "No transactions found for this account." : "A list of recent transactions.")}</TableCaption>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {isLoadingTransactions ? (
                                [...Array(4)].map((_, i) => (<TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full"/></TableCell></TableRow>))
                            ) : transactions.map(tx => (
                                <TableRow key={tx.id}>
                                    <TableCell>{format(new Date(tx.date), 'PP')}</TableCell>
                                    <TableCell className="font-medium">{tx.description}</TableCell>
                                    <TableCell><Badge variant="secondary">{tx.category}</Badge></TableCell>
                                    <TableCell className={cn("text-right font-semibold", tx.type === 'deposit' ? 'text-green-600' : 'text-destructive')}>
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
