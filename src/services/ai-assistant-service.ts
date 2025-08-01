
'use server';

import { analyzeExpenseOpportunities } from '@/ai/flows/analyze-expense-opportunities';


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
// Mock implementation since the database is disconnected.
export async function listEmployees(companyId: string): Promise<any[]> {
  console.log(`[Mock Service] Listing employees for company ${companyId}`);
  return Promise.resolve([]);
}

export async function addEmployee(companyId: string, employeeData: Employee): Promise<string> {
    console.log(`[Mock Service] Adding employee for company ${companyId}`, employeeData);
    return Promise.resolve('mock-employee-id-123');
}

export async function findEmployeeByName(companyId: string, name: string): Promise<any | null> {
    console.log(`[Mock Service] Finding employee by name: ${name}`);
    return Promise.resolve(null);
}


// == INVOICE SERVICES ==
// Mock implementation since the database is disconnected.
export async function listInvoices(companyId: string): Promise<any[]> {
  console.log(`[Mock Service] Listing invoices for company ${companyId}`);
  return Promise.resolve([]);
}

export async function createInvoice(companyId: string, invoiceData: Invoice): Promise<string> {
    console.log(`[Mock Service] Creating invoice for company ${companyId}`, invoiceData);
    return Promise.resolve('mock-invoice-id-123');
}

export async function updateInvoiceStatus(companyId: string, invoiceNumber: string, status: 'Paid' | 'Pending' | 'Overdue' | 'Draft'): Promise<boolean> {
    console.log(`[Mock Service] Updating invoice ${invoiceNumber} to status ${status}`);
    return Promise.resolve(true);
}


// == EXPENSE SERVICES ==
// Mock implementation since the database is disconnected.
export async function listExpenses(companyId: string): Promise<any[]> {
    console.log(`[Mock Service] Listing expenses for company ${companyId}`);
    return Promise.resolve([]);
}

export async function addExpense(companyId: string, expenseData: Expense): Promise<string> {
    console.log(`[Mock Service] Adding expense for company ${companyId}`, expenseData);
    return Promise.resolve('mock-expense-id-123');
}

export async function deleteLastExpense(companyId: string): Promise<boolean> {
    console.log(`[Mock Service] Deleting last expense for company ${companyId}`);
    return Promise.resolve(true);
}

// == REPORTING & ANALYSIS SERVICES ==
// Mock implementation since the database is disconnected.
export async function generateFinancialSummary(companyId: string): Promise<any> {
  console.log(`[Mock Service] Generating financial summary for company ${companyId}`);
  const totalRevenue = 50000;
  const totalExpenses = 30000;

  const analysis = await analyzeExpenseOpportunities({
      revenue: totalRevenue,
      expenses: totalExpenses,
  });

  return Promise.resolve({
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      analysis,
  });
}
