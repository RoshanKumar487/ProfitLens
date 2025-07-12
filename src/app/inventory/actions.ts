
'use server';

import { db } from '@/lib/firebaseConfig';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDoc,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';

// Data Interfaces
export interface Product {
  id?: string;
  name: string;
  sku?: string;
  category?: string;
  itemType?: 'Goods' | 'Service';
  unit?: string;
  purchasePrice: number;
  salePrice: number;
  gstRate?: number;
  quantity?: number; // Only for 'Goods'
  lowStockThreshold?: number; // Only for 'Goods'
  supplierId?: string;
}

export interface Supplier {
  id?: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

// Product Actions are now managed directly on the page for a spreadsheet-like UX.
// This file is kept for supplier actions and potential future complex product actions.

// Supplier Actions
export async function saveSupplier(
  companyId: string,
  supplierData: Supplier
): Promise<{ success: boolean; message: string; id?: string }> {
  if (!companyId) return { success: false, message: 'Company ID is required.' };

  const batch = writeBatch(db);
  const { id, ...data } = supplierData;
  let newSupplierId = id;

  try {
    if (id) {
      const supplierRef = doc(db, 'suppliers', id);
      batch.update(supplierRef, { ...data, updatedAt: serverTimestamp() });
    } else {
      const newSupplierRef = doc(collection(db, 'suppliers'));
      newSupplierId = newSupplierRef.id;
      batch.set(newSupplierRef, {
        ...data,
        companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return {
      success: true,
      message: `Supplier ${id ? 'updated' : 'created'} successfully.`,
      id: newSupplierId,
    };
  } catch (error: any) {
    console.error('Error saving supplier:', error);
    return { success: false, message: `Failed to save supplier: ${error.message}` };
  }
}

export async function deleteSupplier(
  supplierId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supplierRef = doc(db, 'suppliers', supplierId);
    await deleteDoc(supplierRef);
    return { success: true, message: 'Supplier deleted successfully.' };
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return { success: false, message: `Failed to delete supplier: ${error.message}` };
  }
}


// Stock Adjustment Action could be moved here if needed for more complex logic
export async function adjustStock(
  productId: string,
  adjustment: number,
  type: 'Purchase' | 'Sale' | 'Correction'
): Promise<{ success: boolean; message: string }> {
  const productRef = doc(db, 'products', productId);
  try {
    await runTransaction(db, async (transaction) => {
      const productDoc = await transaction.get(productRef);
      if (!productDoc.exists()) {
        throw new Error("Product not found.");
      }
      const currentQuantity = productDoc.data().quantity || 0;
      const newQuantity = currentQuantity + adjustment;

      if (newQuantity < 0) {
        throw new Error("Stock quantity cannot be negative.");
      }

      transaction.update(productRef, { quantity: newQuantity });
      // In a real app, you might also log this transaction to an audit trail collection.
    });
    const updatedProduct = await getDoc(productRef);
    const finalQuantity = updatedProduct.data()?.quantity;

    return { success: true, message: `Stock for product updated by ${adjustment}. New total: ${finalQuantity}.` };
  } catch (error: any) {
    console.error("Error adjusting stock:", error);
    return { success: false, message: `Failed to adjust stock: ${error.message}` };
  }
}
