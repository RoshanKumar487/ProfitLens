
'use server';

import { db } from '@/lib/firebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  getDoc,
  writeBatch,
  limit,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { analyzeExpenseOpportunities } from '@/ai/flows/analyze-expense-opportunities';


// Interface Definitions
interface Employee {
  name: string;
  position: string;
  salary: number;
  description?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Invoice {
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  issuedDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
}

interface Expense {
    date: Date;
    amount: number;
    category: string;
    description?: string;
    vendor?: string;
}


// Shared function to get user info - assuming a server context where auth is available
// For simplicity in this service, we'll pass companyId directly.
// The calling action is responsible for security.

// == EMPLOYEE SERVICES ==
export async function listEmployees(companyId: string): Promise<any[]> {
  const q = query(collection(db, 'employees'), where('companyId', '==', companyId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addEmployee(companyId: string, employeeData: Employee): Promise<string> {
    const docRef = await addDoc(collection(db, 'employees'), {
        ...employeeData,
        name_lowercase: employeeData.name.toLowerCase(),
        companyId,
        addedById: 'ai_assistant', // Or get current user if available
        addedBy: 'AI Assistant',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function findEmployeeByName(companyId: string, name: string): Promise<any | null> {
    const q = query(collection(db, 'employees'), where('companyId', '==', companyId), where('name', '==', name), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
}


// == INVOICE SERVICES ==
export async function listInvoices(companyId: string): Promise<any[]> {
  const q = query(collection(db, 'invoices'), where('companyId', '==', companyId), orderBy('issuedDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createInvoice(companyId: string, invoiceData: Invoice): Promise<string> {
    const subtotal = invoiceData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    // Assuming 0 tax/discount for AI-created invoices for simplicity, can be expanded.
    const total = subtotal;

    const newInvoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    const docRef = await addDoc(collection(db, 'invoices'), {
        ...invoiceData,
        companyId,
        invoiceNumber: newInvoiceNumber,
        issuedDate: Timestamp.fromDate(invoiceData.issuedDate),
        dueDate: Timestamp.fromDate(invoiceData.dueDate),
        subtotal,
        discountType: 'fixed',
        discountValue: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        amount: total,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function updateInvoiceStatus(companyId: string, invoiceNumber: string, status: 'Paid' | 'Pending' | 'Overdue' | 'Draft'): Promise<boolean> {
    const q = query(collection(db, 'invoices'), where('companyId', '==', companyId), where('invoiceNumber', '==', invoiceNumber), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return false;
    
    const invoiceRef = snapshot.docs[0].ref;
    await updateDoc(invoiceRef, { status });
    return true;
}


// == EXPENSE SERVICES ==
export async function listExpenses(companyId: string): Promise<any[]> {
    const q = query(collection(db, 'expenses'), where('companyId', '==', companyId), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addExpense(companyId: string, expenseData: Expense): Promise<string> {
    const docRef = await addDoc(collection(db, 'expenses'), {
        ...expenseData,
        companyId,
        date: Timestamp.fromDate(expenseData.date),
        addedById: 'ai_assistant',
        addedBy: 'AI Assistant',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function deleteLastExpense(companyId: string): Promise<boolean> {
    const q = query(collection(db, 'expenses'), where('companyId', '==', companyId), orderBy('createdAt', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return false;

    await deleteDoc(snapshot.docs[0].ref);
    return true;
}

// == REPORTING & ANALYSIS SERVICES ==
export async function generateFinancialSummary(companyId: string): Promise<any> {
  const expensesQuery = query(collection(db, 'expenses'), where('companyId', '==', companyId));
  const revenueQuery = query(collection(db, 'revenueEntries'), where('companyId', '==', companyId));

  const [expensesSnapshot, revenueSnapshot] = await Promise.all([
    getDocs(expensesQuery),
    getDocs(revenueQuery),
  ]);

  const totalExpenses = expensesSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
  const totalRevenue = revenueSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

  const analysis = await analyzeExpenseOpportunities({
      revenue: totalRevenue,
      expenses: totalExpenses,
  });

  return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      analysis,
  };
}
