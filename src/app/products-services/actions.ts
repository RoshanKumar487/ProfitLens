
'use server';

import { db } from '@/lib/firebaseConfig';
import { collection, doc, writeBatch, serverTimestamp, deleteDoc } from 'firebase/firestore';

// A type for the product data coming from the client.
// It's flexible to handle both new (with 'isNew') and existing products.
type ClientProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  itemType: 'Goods' | 'Service';
  unit: string;
  salePrice: number;
  purchasePrice: number;
  gstRate: number;
  quantity?: number;
  lowStockThreshold?: number;
  customFields?: { [key: string]: string };
  isNew?: boolean;
};

/**
 * Saves all product changes (creates and updates) in a single batch operation.
 * @param products - An array of product objects from the client.
 * @param companyId - The ID of the company to which the products belong.
 * @returns An object indicating success or failure.
 */
export async function saveAllProducts(
  products: ClientProduct[],
  companyId: string
): Promise<{ success: boolean; message: string }> {
  if (!companyId) {
    return { success: false, message: 'User or company information is missing.' };
  }
  if (!products || products.length === 0) {
    return { success: false, message: 'No product data provided.' };
  }

  const batch = writeBatch(db);
  let changesCount = 0;

  try {
    for (const product of products) {
      // Skip saving if the product name is empty, especially for new rows.
      if (!product.name || product.name.trim() === '') {
        continue;
      }

      const { id, isNew, ...productData } = product;
      
      const isGoods = productData.itemType === 'Goods';

      // Prepare data for Firestore, ensuring correct types and removing undefined values
      const dataToSave = {
        ...productData,
        // Only include stock-related fields if the itemType is 'Goods'
        quantity: isGoods ? (productData.quantity ?? 0) : null,
        lowStockThreshold: isGoods ? (productData.lowStockThreshold ?? 10) : null,
        customFields: productData.customFields || {},
        updatedAt: serverTimestamp(),
      };
      
      // Clean up any potential 'undefined' values before saving
      Object.keys(dataToSave).forEach(key => (dataToSave as any)[key] === undefined && delete (dataToSave as any)[key]);


      if (isNew) {
        const newProductRef = doc(collection(db, 'products'));
        batch.set(newProductRef, {
          ...dataToSave,
          companyId: companyId,
          createdAt: serverTimestamp(),
        });
      } else {
        const productRef = doc(db, 'products', id);
        batch.update(productRef, dataToSave);
      }
      changesCount++;
    }

    if (changesCount === 0) {
      return { success: true, message: "No changes to save." };
    }

    await batch.commit();
    return { success: true, message: `Successfully saved ${changesCount} product(s).` };
  } catch (error: any) {
    console.error("Error saving products:", error);
    return { success: false, message: `Failed to save products: ${error.message}` };
  }
}

/**
 * Deletes a single product from Firestore.
 * @param productId - The ID of the product to delete.
 * @returns An object indicating success or failure.
 */
export async function deleteProduct(productId: string): Promise<{ success: boolean; message: string }> {
  if (!productId) {
    return { success: false, message: 'Product ID is required.' };
  }

  try {
    const productRef = doc(db, 'products', productId);
    await deleteDoc(productRef);
    return { success: true, message: 'Product deleted successfully.' };
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return { success: false, message: `Failed to delete product: ${error.message}` };
  }
}
