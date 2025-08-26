
'use server';

import { analyzeExpenseOpportunities } from '@/ai/flows/analyze-expense-opportunities';
import { db } from '@/lib/firebaseAdmin';

// Interface Definitions
interface Employee {
  name: string;
  position: string;
  salary: number;
  description?: string;
}

interface Expense {
    date: Date;
    amount: number;
    category: string;
    description?: string;
    vendor?: string;
}

// Helper function to get docs from a snapshot
const getDocsFromSnapshot = (snapshot: FirebaseFirestore.QuerySnapshot) => {
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// == EMPLOYEE SERVICES ==
export async function listEmployees(companyId: string): Promise<any[]> {
    const snapshot = await db.collection('employees').where('companyId', '==', companyId).get();
    return getDocsFromSnapshot(snapshot);
}

export async function addEmployee(companyId: string, employeeData: Employee): Promise<string> {
    const employeeRef = await db.collection('employees').add({
        ...employeeData,
        companyId,
        createdAt: new Date(),
    });
    return employeeRef.id;
}

export async function findEmployeeByName(companyId: string, name: string): Promise<any | null> {
    const snapshot = await db.collection('employees')
        .where('companyId', '==', companyId)
        .where('name', '==', name)
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
}

// == INVOICE SERVICES ==
export async function listInvoices(companyId: string): Promise<any[]> {
  const snapshot = await db.collection('invoices').where('companyId', '==', companyId).get();
  return getDocsFromSnapshot(snapshot);
}

export async function updateInvoiceStatus(companyId: string, invoiceNumber: string, status: 'Paid' | 'Pending' | 'Overdue' | 'Draft'): Promise<boolean> {
    const snapshot = await db.collection('invoices')
        .where('companyId', '==', companyId)
        .where('invoiceNumber', '==', invoiceNumber)
        .limit(1)
        .get();
        
    if (snapshot.empty) return false;
    
    await snapshot.docs[0].ref.update({ status });
    return true;
}

// == EXPENSE SERVICES ==
export async function listExpenses(companyId: string): Promise<any[]> {
    const snapshot = await db.collection('expenses').where('companyId', '==', companyId).get();
    return getDocsFromSnapshot(snapshot);
}

export async function addExpense(companyId: string, expenseData: Expense): Promise<string> {
    const expenseRef = await db.collection('expenses').add({
        ...expenseData,
        companyId,
        createdAt: new Date(),
    });
    return expenseRef.id;
}

export async function deleteLastExpense(companyId: string): Promise<boolean> {
    const snapshot = await db.collection('expenses')
        .where('companyId', '==', companyId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    return true;
}

// == REPORTING & ANALYSIS SERVICES ==
export async function generateFinancialSummary(companyId: string): Promise<any> {
    const revenueSnapshot = await db.collection('revenue').where('companyId', '==', companyId).get();
    const expensesSnapshot = await db.collection('expenses').where('companyId', '==', companyId).get();

    const totalRevenue = revenueSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    const totalExpenses = expensesSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
  
  try {
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
  } catch (error) {
    console.error("[Service Error] Generating financial summary:", error);
    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      analysis: { summary: "AI analysis could not be generated.", opportunities: [], recommendations: [] }
    };
  }
}
