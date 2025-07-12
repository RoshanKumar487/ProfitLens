
'use server';

import { db } from '@/lib/firebaseConfig';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDocs,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';

// Data Interfaces
export interface Product {
  id?: string;
  name: string;
  sku?: string;
  category?: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  lowStockThreshold?: number;
  supplierId?: string;
}

export interface Supplier {
  id?: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

// Product Actions
export async function saveProduct(
  companyId: string,
  productData: Product
): Promise<{ success: boolean; message: string; id?: string }> {
  if (!companyId) return { success: false, message: 'Company ID is required.' };

  const batch = writeBatch(db);
  const { id, ...data } = productData;

  try {
    if (id) {
      // Update existing product
      const productRef = doc(db, 'products', id);
      batch.update(productRef, { ...data, updatedAt: serverTimestamp() });
    } else {
      // Create new product
      const productRef = doc(collection(db, 'products'));
      batch.set(productRef, {
        ...data,
        companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return {
      success: true,
      message: `Product ${id ? 'updated' : 'created'} successfully.`,
      id: id || '',
    };
  } catch (error: any) {
    console.error('Error saving product:', error);
    return { success: false, message: `Failed to save product: ${error.message}` };
  }
}

export async function deleteProduct(
  productId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const productRef = doc(db, 'products', productId);
    await deleteDoc(productRef);
    return { success: true, message: 'Product deleted successfully.' };
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return { success: false, message: `Failed to delete product: ${error.message}` };
  }
}

// Supplier Actions
export async function saveSupplier(
  companyId: string,
  supplierData: Supplier
): Promise<{ success: boolean; message: string; id?: string }> {
  if (!companyId) return { success: false, message: 'Company ID is required.' };

  const batch = writeBatch(db);
  const { id, ...data } = supplierData;

  try {
    if (id) {
      const supplierRef = doc(db, 'suppliers', id);
      batch.update(supplierRef, { ...data, updatedAt: serverTimestamp() });
    } else {
      const supplierRef = doc(collection(db, 'suppliers'));
      batch.set(supplierRef, {
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
      id: id || '',
    };
  } catch (error: any) {
    console.error('Error saving supplier:', error);
    return { success: false, message: `Failed to save supplier: ${error.message}` };
  }
}

export async function deleteSupplier(
  supplierId: string
): Promise<{ success: boolean; message: string }> {
  // Note: A more robust implementation would check if this supplier is linked to any products
  // and either prevent deletion or handle unlinking.
  try {
    const supplierRef = doc(db, 'suppliers', supplierId);
    await deleteDoc(supplierRef);
    return { success: true, message: 'Supplier deleted successfully.' };
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return { success: false, message: `Failed to delete supplier: ${error.message}` };
  }
}


// Stock Adjustment Action
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
      // In a real app, you would also log this transaction to an audit trail collection.
    });
    return { success: true, message: `Stock for product updated by ${adjustment}. New total: ${await (await getDoc(productRef)).data()?.quantity}.` };
  } catch (error: any) {
    console.error("Error adjusting stock:", error);
    return { success: false, message: `Failed to adjust stock: ${error.message}` };
  }
}
