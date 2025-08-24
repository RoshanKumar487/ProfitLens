
'use server';

import { analyzeExpenseOpportunities } from '@/ai/flows/analyze-expense-opportunities';

// NOTE: All database functionality has been removed.
// These functions now return empty or mock data to prevent errors.

// Interface Definitions
interface Employee {
  name: string;
  position: string;
  salary: number;
  description?: string;
}

interface Invoice {
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  issuedDate: Date;
  dueDate: Date;
  items: { id: string; description: string; quantity: number; unitPrice: number; }[];
  status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
}

interface Expense {
    date: Date;
    amount: number;
    category: string;
    description?: string;
    vendor?: string;
}


// == EMPLOYEE SERVICES ==
export async function listEmployees(companyId: string): Promise<any[]> {
  console.log(`[Mock Service] Listing employees for company ${companyId}`);
  return Promise.resolve([
    { name: 'Alice Johnson', position: 'Software Engineer', salary: 95000, description: 'Frontend specialist' },
    { name: 'Bob Williams', position: 'Project Manager', salary: 105000, description: 'Core product team lead' }
  ]);
}

export async function addEmployee(companyId: string, employeeData: Employee): Promise<string> {
    console.log(`[Mock Service] Adding employee to company ${companyId}:`, employeeData);
    return Promise.resolve(`new-employee-${Date.now()}`);
}

export async function findEmployeeByName(companyId: string, name: string): Promise<any | null> {
    console.log(`[Mock Service] Finding employee by name: ${name}`);
    if (name.toLowerCase().includes('alice')) {
        return Promise.resolve({ id: 'emp1', name: 'Alice Johnson', position: 'Software Engineer', salary: 95000 });
    }
    return Promise.resolve(null);
}


// == INVOICE SERVICES ==
export async function listInvoices(companyId: string): Promise<any[]> {
  console.log(`[Mock Service] Listing invoices for company ${companyId}`);
  return Promise.resolve([
    { invoiceNumber: 'INV001', clientName: 'Acme Corp', amount: 2500, status: 'Paid' },
    { invoiceNumber: 'INV002', clientName: 'Stark Industries', amount: 8000, status: 'Pending' }
  ]);
}

export async function updateInvoiceStatus(companyId: string, invoiceNumber: string, status: 'Paid' | 'Pending' | 'Overdue' | 'Draft'): Promise<boolean> {
    console.log(`[Mock Service] Updating invoice ${invoiceNumber} to status ${status}`);
    return Promise.resolve(true);
}


// == EXPENSE SERVICES ==
export async function listExpenses(companyId: string): Promise<any[]> {
    console.log(`[Mock Service] Listing expenses for company ${companyId}`);
    return Promise.resolve([
        { date: new Date(), amount: 150, category: 'Office Supplies', description: 'Printer paper' }
    ]);
}

export async function addExpense(companyId: string, expenseData: Expense): Promise<string> {
    console.log(`[Mock Service] Adding expense to company ${companyId}:`, expenseData);
    return Promise.resolve(`new-expense-${Date.now()}`);
}

export async function deleteLastExpense(companyId: string): Promise<boolean> {
    console.log(`[Mock Service] Deleting last expense for company ${companyId}`);
    return Promise.resolve(true);
}

// == REPORTING & ANALYSIS SERVICES ==
export async function generateFinancialSummary(companyId: string): Promise<any> {
  console.log(`[Mock Service] Generating financial summary for company ${companyId}`);
  const totalRevenue = 50000;
  const totalExpenses = 30000;
  
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
