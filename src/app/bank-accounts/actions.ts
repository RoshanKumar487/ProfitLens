'use server';

import { db } from '@/lib/firebaseConfig';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

export interface BankAccountData {
  id?: string;
  accountHolderName: string;
  bankName: string;
  accountNumberLast4: string;
  accountType: 'checking' | 'savings' | 'credit' | 'other';
  balance: number;
  companyId: string;
}

export interface TransactionData {
  id?: string;
  accountId: string;
  companyId: string;
  date: Date;
  description: string;
  category: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
}

// Bank Account Actions
export async function addBankAccount(accountData: Omit<BankAccountData, 'id' | 'companyId'>, companyId: string): Promise<{ success: boolean; message: string; id?: string }> {
  if (!companyId) return { success: false, message: 'User is not associated with a company.' };
  try {
    const docRef = await addDoc(collection(db, 'bankAccounts'), {
      ...accountData,
      companyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, message: 'Bank account added successfully.', id: docRef.id };
  } catch (error: any) {
    console.error("Error adding bank account:", error);
    return { success: false, message: `Failed to add bank account: ${error.message}` };
  }
}

export async function updateBankAccount(id: string, updates: Partial<BankAccountData>): Promise<{ success: boolean; message: string }> {
  try {
    const accountRef = doc(db, 'bankAccounts', id);
    await updateDoc(accountRef, { ...updates, updatedAt: serverTimestamp() });
    return { success: true, message: 'Bank account updated successfully.' };
  } catch (error: any) {
    console.error("Error updating bank account:", error);
    return { success: false, message: `Failed to update bank account: ${error.message}` };
  }
}

export async function deleteBankAccount(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const batch = writeBatch(db);
    
    // Delete the account document
    const accountRef = doc(db, 'bankAccounts', id);
    batch.delete(accountRef);

    // Delete all associated transactions
    const transactionsRef = collection(db, 'bankAccounts', id, 'transactions');
    const transactionsQuery = query(transactionsRef);
    const transactionsSnapshot = await getDocs(transactionsQuery);
    transactionsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return { success: true, message: 'Bank account and all its transactions deleted successfully.' };
  } catch (error: any) {
    console.error("Error deleting bank account:", error);
    return { success: false, message: `Failed to delete bank account: ${error.message}` };
  }
}

// Transaction Actions
export async function addTransaction(transactionData: Omit<TransactionData, 'id' | 'companyId'>, companyId: string): Promise<{ success: boolean; message: string, id?: string }> {
  try {
    const { accountId, amount, type } = transactionData;
    const batch = writeBatch(db);
    const accountRef = doc(db, 'bankAccounts', accountId);

    // 1. Get current balance
    const accountSnap = await getDoc(accountRef);
    if (!accountSnap.exists()) {
      throw new Error("Bank account not found.");
    }
    const currentBalance = accountSnap.data().balance || 0;
    
    // 2. Calculate new balance
    const newBalance = type === 'deposit' ? currentBalance + amount : currentBalance - amount;

    // 3. Add transaction document to the subcollection
    const transactionRef = doc(collection(db, 'bankAccounts', accountId, 'transactions'));
    batch.set(transactionRef, { 
      ...transactionData, 
      companyId,
      createdAt: serverTimestamp()
    });

    // 4. Update bank account balance
    batch.update(accountRef, { balance: newBalance, updatedAt: serverTimestamp() });

    await batch.commit();
    return { success: true, message: 'Transaction added successfully.', id: transactionRef.id };

  } catch (error: any) {
    console.error("Error adding transaction:", error);
    return { success: false, message: `Failed to add transaction: ${error.message}` };
  }
}

export async function deleteTransaction(accountId: string, transactionId: string): Promise<{ success: boolean; message: string }> {
  try {
    const batch = writeBatch(db);
    const accountRef = doc(db, 'bankAccounts', accountId);
    const transactionRef = doc(db, 'bankAccounts', accountId, 'transactions', transactionId);

    // 1. Get transaction and account data
    const [accountSnap, transactionSnap] = await Promise.all([getDoc(accountRef), getDoc(transactionRef)]);
    
    if (!accountSnap.exists() || !transactionSnap.exists()) {
      throw new Error("Account or transaction not found.");
    }
    const accountData = accountSnap.data();
    const transactionData = transactionSnap.data() as TransactionData;

    // 2. Revert the balance
    const currentBalance = accountData.balance;
    const newBalance = transactionData.type === 'deposit' 
      ? currentBalance - transactionData.amount 
      : currentBalance + transactionData.amount;

    // 3. Delete transaction
    batch.delete(transactionRef);

    // 4. Update balance
    batch.update(accountRef, { balance: newBalance, updatedAt: serverTimestamp() });
    
    await batch.commit();
    return { success: true, message: 'Transaction deleted successfully.' };
  } catch (error: any) {
    console.error("Error deleting transaction:", error);
    return { success: false, message: `Failed to delete transaction: ${error.message}` };
  }
}
// Helper to get doc ref for server actions
async function getDoc(ref: any) {
  const { getDoc: get } = await import('firebase/firestore');
  return get(ref);
}
