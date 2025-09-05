
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

interface Expense {
    date: Date;
    amount: number;
    category: string;
    description?: string;
    vendor?: string;
}

// == EMPLOYEE SERVICES ==
export async function listEmployees(companyId: string): Promise<any[]> {
    const { db } = await connectToDatabase();
    const employees = await db.collection('employees').find({ companyId: new ObjectId(companyId) }).toArray();
    return JSON.parse(JSON.stringify(employees)); // Serialize to handle ObjectId
}

export async function addEmployee(companyId: string, employeeData: Employee): Promise<string> {
    const { db } = await connectToDatabase();
    const result = await db.collection('employees').insertOne({
        ...employeeData,
        companyId: new ObjectId(companyId),
        createdAt: new Date(),
    });
    return result.insertedId.toHexString();
}

export async function findEmployeeByName(companyId: string, name: string): Promise<any | null> {
    const { db } = await connectToDatabase();
    const employee = await db.collection('employees').findOne({
        companyId: new ObjectId(companyId),
        name: name,
    });
    return JSON.parse(JSON.stringify(employee)); // Serialize to handle ObjectId
}

// == INVOICE SERVICES ==
export async function listInvoices(companyId: string): Promise<any[]> {
  const { db } = await connectToDatabase();
  const invoices = await db.collection('invoices').find({ companyId: new ObjectId(companyId) }).toArray();
  return JSON.parse(JSON.stringify(invoices));
}

export async function updateInvoiceStatus(companyId: string, invoiceNumber: string, status: 'Paid' | 'Pending' | 'Overdue' | 'Draft'): Promise<boolean> {
    const { db } = await connectToDatabase();
    const result = await db.collection('invoices').updateOne(
        { companyId: new ObjectId(companyId), invoiceNumber: invoiceNumber },
        { $set: { status: status } }
    );
    return result.modifiedCount > 0;
}

// == EXPENSE SERVICES ==
export async function listExpenses(companyId: string): Promise<any[]> {
    const { db } = await connectToDatabase();
    const expenses = await db.collection('expenses').find({ companyId: new ObjectId(companyId) }).toArray();
    return JSON.parse(JSON.stringify(expenses));
}

export async function addExpense(companyId: string, expenseData: Expense): Promise<string> {
    const { db } = await connectToDatabase();
    const result = await db.collection('expenses').insertOne({
        ...expenseData,
        companyId: new ObjectId(companyId),
        createdAt: new Date(),
    });
    return result.insertedId.toHexString();
}

export async function deleteLastExpense(companyId: string): Promise<boolean> {
    const { db } = await connectToDatabase();
    const lastExpense = await db.collection('expenses').find({ companyId: new ObjectId(companyId) }).sort({ createdAt: -1 }).limit(1).toArray();
    if (lastExpense.length === 0) {
        return false;
    }
    const result = await db.collection('expenses').deleteOne({ _id: lastExpense[0]._id });
    return result.deletedCount > 0;
}

// == REPORTING & ANALYSIS SERVICES ==
export async function generateFinancialSummary(companyId: string): Promise<any> {
    const { db } = await connectToDatabase();
    const revenueCursor = await db.collection('revenue').find({ companyId: new ObjectId(companyId) });
    const expensesCursor = await db.collection('expenses').find({ companyId: new ObjectId(companyId) });

    const totalRevenue = (await revenueCursor.toArray()).reduce((sum, doc) => sum + doc.amount, 0);
    const totalExpenses = (await expensesCursor.toArray()).reduce((sum, doc) => sum + doc.amount, 0);
  
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
