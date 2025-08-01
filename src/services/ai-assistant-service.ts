
'use server';

import { analyzeExpenseOpportunities } from '@/ai/flows/analyze-expense-opportunities';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';


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
  try {
    const { db } = await connectToDatabase();
    const employees = await db.collection('employees')
      .find({ companyId })
      .project({ name: 1, position: 1, salary: 1, description: 1 })
      .toArray();
    return employees.map(emp => ({ ...emp, _id: emp._id.toString() }));
  } catch (error) {
    console.error("[Service Error] Listing employees:", error);
    return [];
  }
}

export async function addEmployee(companyId: string, employeeData: Employee): Promise<string> {
    try {
        const { db } = await connectToDatabase();
        const result = await db.collection('employees').insertOne({
            ...employeeData,
            companyId,
            createdAt: new Date(),
        });
        return result.insertedId.toHexString();
    } catch (error) {
        console.error("[Service Error] Adding employee:", error);
        throw new Error("Failed to add employee.");
    }
}

export async function findEmployeeByName(companyId: string, name: string): Promise<any | null> {
    try {
        const { db } = await connectToDatabase();
        const employee = await db.collection('employees').findOne({ name, companyId });
        if (employee) {
            return { ...employee, _id: employee._id.toString() };
        }
        return null;
    } catch (error) {
        console.error("[Service Error] Finding employee by name:", error);
        return null;
    }
}


// == INVOICE SERVICES ==
export async function listInvoices(companyId: string): Promise<any[]> {
  console.log(`[Mock Service] Listing invoices for company ${companyId}`);
  // This part is not yet migrated as it's more complex and requires more info on invoice structure
  return Promise.resolve([]);
}

export async function updateInvoiceStatus(companyId: string, invoiceNumber: string, status: 'Paid' | 'Pending' | 'Overdue' | 'Draft'): Promise<boolean> {
    console.log(`[Mock Service] Updating invoice ${invoiceNumber} to status ${status}`);
    // This part is not yet migrated
    return Promise.resolve(true);
}


// == EXPENSE SERVICES ==
export async function listExpenses(companyId: string): Promise<any[]> {
    try {
        const { db } = await connectToDatabase();
        const expenses = await db.collection('expenses').find({ companyId }).toArray();
        return expenses.map(exp => ({ ...exp, _id: exp._id.toString() }));
    } catch (error) {
        console.error("[Service Error] Listing expenses:", error);
        return [];
    }
}

export async function addExpense(companyId: string, expenseData: Expense): Promise<string> {
    try {
        const { db } = await connectToDatabase();
        const result = await db.collection('expenses').insertOne({
            ...expenseData,
            companyId,
            createdAt: new Date(),
        });
        return result.insertedId.toHexString();
    } catch (error) {
        console.error("[Service Error] Adding expense:", error);
        throw new Error("Failed to add expense.");
    }
}

export async function deleteLastExpense(companyId: string): Promise<boolean> {
    try {
        const { db } = await connectToDatabase();
        const lastExpense = await db.collection('expenses').find({ companyId }).sort({ createdAt: -1 }).limit(1).toArray();
        if (lastExpense.length > 0) {
            await db.collection('expenses').deleteOne({ _id: lastExpense[0]._id });
            return true;
        }
        return false;
    } catch (error) {
        console.error("[Service Error] Deleting last expense:", error);
        return false;
    }
}

// == REPORTING & ANALYSIS SERVICES ==
export async function generateFinancialSummary(companyId: string): Promise<any> {
  try {
    const { db } = await connectToDatabase();
    
    // Fetch total revenue (using a simplified model for now)
    const revenuePipeline = [
      { $match: { companyId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ];
    const revenueResult = await db.collection('revenues').aggregate(revenuePipeline).toArray();
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    
    // Fetch total expenses
    const expensePipeline = [
      { $match: { companyId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ];
    const expenseResult = await db.collection('expenses').aggregate(expensePipeline).toArray();
    const totalExpenses = expenseResult.length > 0 ? expenseResult[0].total : 0;

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
    // Return a default structure on error
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      analysis: { summary: "Could not generate analysis due to an error.", opportunities: [], recommendations: [] }
    };
  }
}
