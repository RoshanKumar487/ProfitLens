
'use server';

import { revalidatePath } from 'next/cache';
import { type ProductSettings } from '@/app/settings/actions';
import { db } from '@/lib/firebaseAdmin';

export interface Product {
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
}

export interface ProductDisplay extends Product {
  id: string;
  isNew?: boolean;
}

export async function getAllProducts(companyId: string): Promise<ProductDisplay[]> {
  try {
    const snapshot = await db.collection('products')
      .where('companyId', '==', companyId)
      .orderBy('name')
      .get();
      
    if (snapshot.empty) {
        return [];
    }
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as ProductDisplay[];
    
  } catch (error) {
    console.error("Failed to get products:", error);
    throw new Error("Could not fetch products.");
  }
}

export async function saveAllProducts(companyId: string, products: ProductDisplay[]) {
  try {
    const batch = db.batch();
    
    products.forEach(p => {
      const { id, isNew, ...productData } = p;
      const docRef = isNew ? db.collection('products').doc() : db.collection('products').doc(id);
      
      const payload: any = { ...productData, companyId };
      if (isNew) {
        payload.createdAt = new Date();
      } else {
        payload.updatedAt = new Date();
      }
      
      batch.set(docRef, payload, { merge: true });
    });

    if (products.length === 0) {
      return { success: true, message: "No changes to save." };
    }

    await batch.commit();
    revalidatePath('/products-services');
    return { success: true, message: 'Products saved successfully.' };
  } catch (error: any) {
    console.error('Failed to save products:', error);
    return { success: false, message: `Failed to save products: ${error.message}` };
  }
}

export async function deleteProduct(companyId: string, productId: string) {
  try {
    const docRef = db.collection('products').doc(productId);
    const doc = await docRef.get();
    
    if (!doc.exists || doc.data()?.companyId !== companyId) {
       return { success: false, message: "Product not found or you don't have permission to delete it." };
    }

    await docRef.delete();

    revalidatePath('/products-services');
    return { success: true, message: 'Product deleted successfully.' };
  } catch (error: any) {
    console.error('Failed to delete product:', error);
    return { success: false, message: `Failed to delete product: ${error.message}` };
  }
}

export async function getProductSettingsForCompany(companyId: string): Promise<ProductSettings> {
  try {
    const settingsDoc = await db.collection('settings').doc(companyId).get();
    if (settingsDoc.exists) {
      const settingsData = settingsDoc.data();
      if (settingsData && settingsData.productSettings) {
        return settingsData.productSettings;
      }
    }
    return { customFields: [] };
  } catch (error) {
    console.error("Failed to get product settings:", error);
    return { customFields: [] };
  }
}
