
'use server';

import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/app/auth/actions';
import { type ProductSettings } from '@/app/settings/actions';

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

async function getCompanyId(): Promise<ObjectId | null> {
    const session = await getSession();
    if (!session?.companyId) {
        return null;
    }
    return new ObjectId(session.companyId);
}

export async function getAllProducts(): Promise<ProductDisplay[]> {
    const companyId = await getCompanyId();
    if (!companyId) return [];
    
    try {
        const { db } = await connectToDatabase();
        const products = await db.collection('products')
            .find({ companyId })
            .sort({ name: 1 })
            .toArray();

        return products.map(doc => {
            const { _id, companyId, ...rest } = doc;
            return { id: _id.toHexString(), ...rest } as unknown as ProductDisplay;
        });
    } catch (error) {
        console.error("Failed to get products:", error);
        throw new Error("Could not fetch products.");
    }
}

export async function saveAllProducts(products: ProductDisplay[]) {
    const companyId = await getCompanyId();
    if (!companyId) {
        return { success: false, message: "User not authenticated." };
    }

    try {
        const { db } = await connectToDatabase();
        const collection = db.collection('products');
        const batch = collection.initializeUnorderedBulkOp();

        for (const product of products) {
            const { id, isNew, ...productData } = product;
            if (isNew) {
                batch.insert({ ...productData, companyId, createdAt: new Date() });
            } else {
                batch.find({ _id: new ObjectId(id), companyId }).updateOne({ $set: productData });
            }
        }
        
        if (batch.length > 0) {
            await batch.execute();
        }
        
        revalidatePath('/products-services');
        return { success: true, message: 'Products saved successfully.' };
    } catch (error: any) {
        console.error('Failed to save products:', error);
        return { success: false, message: `Failed to save products: ${error.message}` };
    }
}


export async function deleteProduct(productId: string) {
    const companyId = await getCompanyId();
    if (!companyId || !ObjectId.isValid(productId)) {
        return { success: false, message: 'Invalid product ID or company.' };
    }

    try {
        const { db } = await connectToDatabase();
        await db.collection('products').deleteOne({
            _id: new ObjectId(productId),
            companyId,
        });
        revalidatePath('/products-services');
        return { success: true, message: 'Product deleted successfully.' };
    } catch (error: any) {
        console.error('Failed to delete product:', error);
        return { success: false, message: `Failed to delete product: ${error.message}` };
    }
}


export async function getProductSettingsForCompany(): Promise<ProductSettings> {
    const companyId = await getCompanyId();
    if (!companyId) return { customFields: [] };

    try {
        const { db } = await connectToDatabase();
        const settings = await db.collection('settings').findOne({ companyId, type: 'product' });
        return settings ? (settings.data as ProductSettings) : { customFields: [] };
    } catch (error) {
        console.error("Failed to get product settings:", error);
        return { customFields: [] };
    }
}
