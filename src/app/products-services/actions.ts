
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { revalidatePath } from 'next/cache';
import { ObjectId } from 'mongodb';

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
    const { db } = await connectToDatabase();
    const products = await db.collection('products')
      .find({ companyId })
      .sort({ name: 1 })
      .toArray();

    return products.map(p => ({
      ...p,
      id: p._id.toHexString(),
    })) as ProductDisplay[];
  } catch (error) {
    console.error("Failed to get products:", error);
    throw new Error("Could not fetch products.");
  }
}

export async function saveAllProducts(companyId: string, products: ProductDisplay[]) {
  try {
    const { db } = await connectToDatabase();
    const bulkOps = products.map(p => {
      const { id, isNew, ...productData } = p;
      if (isNew || !ObjectId.isValid(id)) {
        return {
          insertOne: {
            document: { ...productData, companyId, createdAt: new Date() }
          }
        };
      } else {
        return {
          updateOne: {
            filter: { _id: new ObjectId(id), companyId },
            update: { $set: { ...productData, updatedAt: new Date() } },
            upsert: true
          }
        };
      }
    });

    if (bulkOps.length === 0) {
      return { success: true, message: "No changes to save." };
    }

    await db.collection('products').bulkWrite(bulkOps);
    revalidatePath('/products-services');
    return { success: true, message: 'Products saved successfully.' };
  } catch (error: any) {
    console.error('Failed to save products:', error);
    return { success: false, message: `Failed to save products: ${error.message}` };
  }
}

export async function deleteProduct(companyId: string, productId: string) {
  if (!ObjectId.isValid(productId)) {
    return { success: false, message: "Invalid product ID." };
  }
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('products').deleteOne({
      _id: new ObjectId(productId),
      companyId: companyId,
    });

    if (result.deletedCount === 0) {
      return { success: false, message: "Product not found or you don't have permission to delete it." };
    }

    revalidatePath('/products-services');
    return { success: true, message: 'Product deleted successfully.' };
  } catch (error: any) {
    console.error('Failed to delete product:', error);
    return { success: false, message: `Failed to delete product: ${error.message}` };
  }
}
