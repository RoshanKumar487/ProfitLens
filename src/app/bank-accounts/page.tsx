
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, orderBy, getDocs, Timestamp, onSnapshot, doc, limit, startAfter, endBefore, limitToLast, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { addBankAccount, updateBankAccount, deleteBankAccount, addTransaction, deleteTransaction, type BankAccountData, type TransactionData } from './actions';

import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, PlusCircle, MoreVertical, Edit, Trash2, Loader2, Save, ArrowLeftRight, CalendarIcon, Info, HandCoins, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

const TRANSACTION_CATEGORIES = [
  'Salary', 'Freelance Income', 'Investment', 'Sales', 'Refunds', // Deposits
  'Rent/Mortgage', 'Utilities', 'Groceries', 'Transportation', 'Software', 'Marketing', 'Taxes', 'Payroll', 'Other' // Withdrawals
];

type FullBankAccount = BankAccountData & { id: string, createdAt: Date };
type FullTransaction = TransactionData & { id: string, createdAt: Date };

const RECORDS_PER_PAGE = 20;

export default function BankAccountsPage() {
  const { user, isLoading: authIsLoading, currencySymbol } = useAuth();
  const { toast } = useToast();

  const [accounts, setAccounts] = useState<FullBankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<FullBankAccount | null>(null);
  const [transactions, setTransactions] = useState<FullTransaction[]>([]);
  
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [currentAccount, setCurrentAccount] = useState<Partial<FullBankAccount>>({});
  const [currentTransaction, setCurrentTransaction] = useState<Partial<TransactionData>>({ type: 'withdrawal', date: new Date() });
  const [itemToDelete, setItemToDelete] = useState<{ type: 'account' | 'transaction', id: string, accountId?: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [txCurrentPage, setTxCurrentPage] = useState(1);
  const [txFirstVisible, setTxFirstVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [txLastVisible, setTxLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  useEffect(() => {
    // Removed all Firebase data fetching logic to prevent errors
    // after backend disconnection.
    setIsLoadingAccounts(false);
  }, []);

  const handleAccountFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId) return;
    
    toast({ title: "Action Disabled", description: "Cannot save data without a backend connection.", variant: "destructive"});
  };

  const handleTransactionFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId || !selectedAccount) return;
    toast({ title: "Action Disabled", description: "Cannot save data without a backend connection.", variant: "destructive"});
  };
  
  const promptDelete = (type: 'account' | 'transaction', id: string, accountId?: string) => {
    setItemToDelete({ type, id, accountId });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsSaving(true);
    toast({ title: "Action Disabled", description: "Cannot delete data without a backend connection.", variant: "destructive"});
    setIsSaving(false);
    setIsDeleteDialogOpen(false);
  };

  if (authIsLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <PageTitle title="Bank Accounts" icon={Banknote} />
        <Card><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>Please sign in to manage bank accounts.</p></CardContent></Card>
      </div>
    );
  }
  
    const handleOpenAccountDialog = (account?: FullBankAccount) => {
    if (account) {
      setIsEditing(true);
      setCurrentAccount(account);
    } else {
      setIsEditing(false);
      setCurrentAccount({ accountType: 'checking' });
    }
    setIsAccountDialogOpen(true);
  };
  
    const handleOpenTransactionDialog = () => {
    setIsTransactionDialogOpen(true);
    setCurrentTransaction({ type: 'withdrawal', date: new Date(), amount: 0 });
  };


  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Bank Accounts" subtitle="Manage your accounts and track transactions." icon={Banknote}>
        <Button onClick={() => handleOpenAccountDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Account
        </Button>
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Your Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingAccounts ? (
                         [...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full mb-2" />)
                    ) : accounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No bank accounts added yet.</p>
                    ) : (
                        <div className="space-y-2">
                        {accounts.map(account => (
                            <div key={account.id} onClick={() => setSelectedAccount(account)} className={cn("p-3 rounded-lg border cursor-pointer transition-all", selectedAccount?.id === account.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50")}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold flex items-center gap-2"><Landmark className="h-4 w-4 text-muted-foreground" /> {account.bankName}</p>
                                        <p className="text-xs text-muted-foreground">•••• {account.accountNumberLast4}</p>
                                    </div>
                                    <p className="text-lg font-bold">{currencySymbol}{account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                     <Badge variant="outline" className="capitalize">{account.accountType}</Badge>
                                     <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleOpenAccountDialog(account);}}><Edit className="h-3 w-3" /></Button>
                                </div>
                            </div>
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
                            <CardDescription>{selectedAccount ? `For ${selectedAccount.bankName}` : 'Select an account to view transactions'}</CardDescription>
                        </div>
                        {selectedAccount && (
                            <Button onClick={handleOpenTransactionDialog} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Transaction</Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {!selectedAccount ? (
                        <Alert className="border-primary/20">
                            <Info className="h-4 w-4 text-primary" />
                            <AlertTitle>Select an Account</AlertTitle>
                            <p className="text-sm text-muted-foreground">Click on an account from the list on the left to see its transactions.</p>
                        </Alert>
                    ) : isLoadingTransactions ? (
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : (
                        <>
                        <Table>
                            <TableCaption>{transactions.length === 0 ? "No transactions for this account." : `Page ${txCurrentPage} of transactions.`}</TableCaption>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell>{format(tx.date, 'MMM dd, yyyy')}</TableCell>
                                        <TableCell className="font-medium">{tx.description}</TableCell>
                                        <TableCell><Badge variant="secondary">{tx.category}</Badge></TableCell>
                                        <TableCell className={cn("text-right font-semibold", tx.type === 'deposit' ? 'text-green-600' : 'text-red-600')}>
                                            {tx.type === 'deposit' ? '+' : '-'}{currencySymbol}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell>
                                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => promptDelete('transaction', tx.id, selectedAccount.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <div className="flex items-center justify-between pt-4">
                            <div className="text-sm text-muted-foreground">
                                Page {txCurrentPage}
                            </div>
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem><PaginationPrevious href="#" className={'pointer-events-none opacity-50'}/></PaginationItem>
                                    <PaginationItem><PaginationNext href="#" className={'pointer-events-none opacity-50'}/></PaginationItem>
                                </PaginationContent>
                            </Pagination>
                         </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>

       {/* Add/Edit Account Dialog */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Bank Account' : 'Add New Bank Account'}</DialogTitle>
            <DialogDescription>Enter the details of your bank account. The current balance will be the starting point for transactions.</DialogDescription>
          </DialogHeader>
          <form id="accountForm" onSubmit={handleAccountFormSubmit} className="space-y-4">
            <Input name="id" type="hidden" value={currentAccount.id || ''} />
             <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input id="bankName" value={currentAccount.bankName || ''} onChange={e => setCurrentAccount({...currentAccount, bankName: e.target.value})} required disabled={isSaving} />
              </div>
              <div>
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input id="accountHolderName" value={currentAccount.accountHolderName || ''} onChange={e => setCurrentAccount({...currentAccount, accountHolderName: e.target.value})} required disabled={isSaving} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="accountNumberLast4">Account Number (Last 4 Digits)</Label>
                    <Input id="accountNumberLast4" value={currentAccount.accountNumberLast4 || ''} onChange={e => setCurrentAccount({...currentAccount, accountNumberLast4: e.target.value})} required maxLength={4} disabled={isSaving} />
                </div>
                <div>
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select value={currentAccount.accountType || 'checking'} onValueChange={(val: any) => setCurrentAccount({...currentAccount, accountType: val})} disabled={isSaving}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="checking">Checking</SelectItem>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="credit">Credit Card</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div>
              <Label htmlFor="balance">Current Balance ({currencySymbol})</Label>
              <Input id="balance" type="number" step="0.01" value={currentAccount.balance ?? ''} onChange={e => setCurrentAccount({...currentAccount, balance: e.target.value})} required disabled={isSaving || isEditing} />
              {isEditing && <p className="text-xs text-muted-foreground mt-1">Balance can only be set for new accounts. It will update automatically as you add transactions.</p>}
            </div>
          </form>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
            <Button type="submit" form="accountForm" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSaving ? 'Saving...' : 'Save Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* Add Transaction Dialog */}
        <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                    <DialogDescription>Log a deposit or withdrawal for {selectedAccount?.bankName}.</DialogDescription>
                </DialogHeader>
                <form id="transactionForm" onSubmit={handleTransactionFormSubmit} className="space-y-4">
                     <div>
                        <Label>Transaction Type</Label>
                        <Select value={currentTransaction.type} onValueChange={(val: any) => setCurrentTransaction({...currentTransaction, type: val})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="withdrawal">Withdrawal / Debit</SelectItem>
                                <SelectItem value="deposit">Deposit / Credit</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="txDate">Date</Label>
                             <Popover>
                                <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{currentTransaction.date ? format(currentTransaction.date, 'PPP') : <span>Pick a date</span>}</Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={currentTransaction.date} onSelect={(d) => setCurrentTransaction({...currentTransaction, date: d})} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label htmlFor="txAmount">Amount ({currencySymbol})</Label>
                            <Input id="txAmount" type="number" step="0.01" min="0" value={currentTransaction.amount ?? ''} onChange={e => setCurrentTransaction({...currentTransaction, amount: e.target.value})} required />
                        </div>
                     </div>
                     <div>
                        <Label htmlFor="txCategory">Category</Label>
                        <Select value={currentTransaction.category} onValueChange={(val) => setCurrentTransaction({...currentTransaction, category: val})}>
                            <SelectTrigger><SelectValue placeholder="Select a category..."/></SelectTrigger>
                            <SelectContent>
                                {TRANSACTION_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                            </SelectContent>
                        </Select>
                     </div>
                     <div>
                        <Label htmlFor="txDescription">Description</Label>
                        <Textarea id="txDescription" value={currentTransaction.description || ''} onChange={e => setCurrentTransaction({...currentTransaction, description: e.target.value})} required />
                     </div>
                </form>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
                    <Button type="submit" form="transactionForm" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isSaving ? 'Saving...' : 'Save Transaction'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the {itemToDelete?.type}
                        {itemToDelete?.type === 'account' && ' and all of its associated transactions'}.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
