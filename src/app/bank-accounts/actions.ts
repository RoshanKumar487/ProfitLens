
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/app/auth/actions';

export interface BankAccount {
    bankName: string;
    accountNumberLast4: string;
    accountType: 'checking' | 'savings' | 'credit';
    balance: number;
}

export interface BankAccountDisplay extends BankAccount {
    id: string;
}

export interface Transaction {
    accountId: string;
    date: Date;
    description: string;
    category: string;
    amount: number;
    type: 'deposit' | 'withdrawal';
}

export interface TransactionDisplay extends Transaction {
    id: string;
}

async function getCompanyId(): Promise<ObjectId | null> {
    const session = await getSession();
    if (!session?.companyId) return null;
    return new ObjectId(session.companyId);
}

export async function getBankAccounts(): Promise<BankAccountDisplay[]> {
    const companyId = await getCompanyId();
    if (!companyId) return [];

    try {
        const { db } = await connectToDatabase();
        const accounts = await db.collection('bank_accounts').find({ companyId }).toArray();
        return accounts.map(doc => {
            const { _id, companyId, ...rest } = doc;
            return { id: _id.toHexString(), ...rest } as unknown as BankAccountDisplay;
        });
    } catch (error) {
        console.error("Failed to get bank accounts:", error);
        return [];
    }
}

export async function addBankAccount(account: BankAccount) {
    const companyId = await getCompanyId();
    if (!companyId) return { success: false, message: "User not authenticated." };

    try {
        const { db } = await connectToDatabase();
        await db.collection('bank_accounts').insertOne({ ...account, companyId });
        revalidatePath('/bank-accounts');
        return { success: true, message: "Bank account added successfully." };
    } catch (error: any) {
        return { success: false, message: `Failed to add account: ${error.message}` };
    }
}

export async function getTransactionsForAccount(accountId: string): Promise<TransactionDisplay[]> {
    const companyId = await getCompanyId();
    if (!companyId || !ObjectId.isValid(accountId)) return [];

    try {
        const { db } = await connectToDatabase();
        const transactions = await db.collection('transactions')
            .find({ companyId, accountId: new ObjectId(accountId) })
            .sort({ date: -1 })
            .limit(100)
            .toArray();
            
        return transactions.map(doc => {
             const { _id, companyId, ...rest } = doc;
             return { 
                 id: _id.toHexString(),
                 ...rest,
                 accountId: doc.accountId.toHexString(),
             } as unknown as TransactionDisplay;
        });
    } catch (error) {
        console.error(`Failed to get transactions for account ${accountId}:`, error);
        return [];
    }
}

export async function addTransaction(transaction: Transaction) {
    const companyId = await getCompanyId();
    if (!companyId || !ObjectId.isValid(transaction.accountId)) return { success: false, message: "Invalid data provided." };

    try {
        const { db } = await connectToDatabase();
        const { accountId, ...transData } = transaction;

        const session = db.client.startSession();
        let result;
        await session.withTransaction(async () => {
            result = await db.collection('transactions').insertOne({ 
                ...transData,
                accountId: new ObjectId(accountId),
                companyId 
            }, { session });

            const updateAmount = transaction.type === 'deposit' ? transaction.amount : -transaction.amount;
            await db.collection('bank_accounts').updateOne(
                { _id: new ObjectId(accountId), companyId },
                { $inc: { balance: updateAmount } },
                { session }
            );
        });
        await session.endSession();

        revalidatePath('/bank-accounts');
        revalidatePath('/dashboard'); // For pie chart
        return { success: true, message: "Transaction recorded successfully." };
    } catch (error: any) {
        return { success: false, message: `Failed to add transaction: ${error.message}` };
    }
}
