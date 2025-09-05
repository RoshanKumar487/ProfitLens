
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getSession } from '@/app/auth/actions';

async function getCompanyId(): Promise<ObjectId | null> {
    const session = await getSession();
    if (!session?.companyId) return null;
    return new ObjectId(session.companyId);
}

const toCSV = (data: any[], headers: string[]): string => {
    const csvRows = [];
    csvRows.push(headers.join(','));
    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
};

export async function exportEmployeeReport(fromDate: Date, toDate: Date): Promise<string> {
    const companyId = await getCompanyId();
    if (!companyId) return "No data";

    const { db } = await connectToDatabase();
    const employees = await db.collection('employees').find({
        companyId,
        createdAt: { $gte: fromDate, $lte: toDate }
    }).toArray();
    
    if (employees.length === 0) return "No data";

    const headers = ['name', 'position', 'salary', 'description', 'joiningDate', 'fatherName', 'selfPhoneNo'];
    return toCSV(employees, headers);
}

export async function exportItemizedSalesReport(fromDate: Date, toDate: Date): Promise<string> {
    const companyId = await getCompanyId();
    if (!companyId) return "No data";

    const { db } = await connectToDatabase();
    const invoices = await db.collection('invoices').find({
        companyId,
        issuedDate: { $gte: fromDate, $lte: toDate }
    }).toArray();

    if (invoices.length === 0) return "No data";

    const allItems: any[] = [];
    invoices.forEach(invoice => {
        invoice.items.forEach((item: any) => {
            allItems.push({
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientName,
                issuedDate: invoice.issuedDate,
                itemDescription: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.quantity * item.unitPrice
            });
        });
    });

    const headers = ['invoiceNumber', 'clientName', 'issuedDate', 'itemDescription', 'quantity', 'unitPrice', 'total'];
    return toCSV(allItems, headers);
}


export async function exportExpenseReport(fromDate: Date, toDate: Date): Promise<string> {
    const companyId = await getCompanyId();
    if (!companyId) return "No data";

    const { db } = await connectToDatabase();
    const expenses = await db.collection('expenses').find({
        companyId,
        date: { $gte: fromDate, $lte: toDate }
    }).toArray();
    
    if (expenses.length === 0) return "No data";

    const headers = ['date', 'category', 'amount', 'vendor', 'description', 'employeeName'];
    return toCSV(expenses, headers);
}

export async function exportProductReport(): Promise<string> {
    const companyId = await getCompanyId();
    if (!companyId) return "No data";

    const { db } = await connectToDatabase();
    const products = await db.collection('products').find({ companyId }).toArray();
    
    if (products.length === 0) return "No data";

    const headers = ['name', 'sku', 'category', 'itemType', 'salePrice', 'purchasePrice', 'quantity', 'lowStockThreshold'];
    return toCSV(products, headers);
}
