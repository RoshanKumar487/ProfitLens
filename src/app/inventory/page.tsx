
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot, writeBatch, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import PageTitle from '@/components/PageTitle';
import DataCard from '@/components/DataCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Save, ShoppingCart, DollarSign, Warehouse, AlertTriangle } from 'lucide-react';
import { saveSupplier, deleteSupplier, type Supplier } from './actions';
import { Badge } from '@/components/ui/badge';
import { v4 as uuidv4 } from 'uuid';

type ProductDisplay = {
  id: string;
  name: string;
  sku: string;
  category: string;
  purchasePrice: number;
  salePrice: number;
  quantity: number;
  lowStockThreshold: number;
  supplierId: string;
  supplierName?: string;
  isNew?: boolean;
};

type SupplierDisplay = Supplier & { id: string };

const getInitials = (name: string = "") => {
  const names = name.split(' ');
  let initials = names[0] ? names[0][0] : '';
  if (names.length > 1 && names[names.length - 1]) {
    initials += names[names.length - 1][0];
  }
  return initials.toUpperCase();
};

export default function InventoryPage() {
    const { user, currencySymbol, isLoading: authIsLoading } = useAuth();
    const { toast } = useToast();

    const [products, setProducts] = useState<ProductDisplay[]>([]);
    const [suppliers, setSuppliers] = useState<SupplierDisplay[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [itemToDelete, setItemToDelete] = useState<{ type: 'product' | 'supplier'; id: string; name: string } | null>(null);

    useEffect(() => {
        if (!user || !user.companyId) {
            setIsLoading(false);
            return;
        }

        const productQuery = query(collection(db, 'products'), where('companyId', '==', user.companyId), orderBy('name'));
        const supplierQuery = query(collection(db, 'suppliers'), where('companyId', '==', user.companyId), orderBy('name'));

        const unsubProducts = onSnapshot(productQuery, (snapshot) => {
            const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductDisplay));
            setProducts(fetchedProducts);
            if (suppliers.length > 0 || snapshot.docs.length === 0 && suppliers.length === 0) setIsLoading(false);
        }, (error) => { console.error("Error fetching products:", error); toast({ variant: 'destructive', title: "Error", description: "Could not fetch products." }); });

        const unsubSuppliers = onSnapshot(supplierQuery, (snapshot) => {
            const fetchedSuppliers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierDisplay));
            setSuppliers(fetchedSuppliers);
            if(products.length > 0 || snapshot.docs.length === 0 && products.length === 0) setIsLoading(false);
        }, (error) => { console.error("Error fetching suppliers:", error); toast({ variant: 'destructive', title: "Error", description: "Could not fetch suppliers." }); });
        
        return () => { unsubProducts(); unsubSuppliers(); };
    }, [user?.companyId, toast]);
    
    const productsWithNames = useMemo(() => {
        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
        return products.map(p => ({ ...p, supplierName: p.supplierId ? supplierMap.get(p.supplierId) : 'N/A' }));
    }, [products, suppliers]);

    const handleProductInputChange = (productId: string, field: keyof ProductDisplay, value: any) => {
      setProducts(prev =>
        prev.map(p => {
          if (p.id === productId) {
            const parsedValue = ['purchasePrice', 'salePrice', 'quantity', 'lowStockThreshold'].includes(field)
              ? parseFloat(value) || 0
              : value;
            return { ...p, [field]: parsedValue };
          }
          return p;
        })
      );
    };

    const handleAddProductRow = () => {
      const newProduct: ProductDisplay = {
        id: uuidv4(),
        isNew: true,
        name: '',
        sku: '',
        category: '',
        purchasePrice: 0,
        salePrice: 0,
        quantity: 0,
        lowStockThreshold: 10,
        supplierId: '',
      };
      setProducts(prev => [...prev, newProduct]);
    };
    
    const handleSaveAllProducts = async () => {
      if (!user?.companyId) return;
      setIsSaving(true);
      const batch = writeBatch(db);
      let changesCount = 0;

      for (const product of products) {
        if (!product.name) continue;

        const { id, isNew, supplierName, ...productData } = product;

        if (isNew) {
          const newProductRef = doc(collection(db, 'products'));
          batch.set(newProductRef, {
            ...productData,
            companyId: user.companyId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          changesCount++;
        } else {
          // In a real app, you would compare with original data to avoid unnecessary writes
          const productRef = doc(db, 'products', id);
          batch.update(productRef, { ...productData, updatedAt: serverTimestamp() });
          changesCount++; // Simplified for now
        }
      }

      if (changesCount === 0) {
        toast({ title: "No Changes", description: "No new products or changes to save." });
        setIsSaving(false);
        return;
      }

      try {
        await batch.commit();
        toast({ title: "Success", description: "All product changes saved successfully." });
      } catch (error: any) {
        toast({ title: "Error", description: `Failed to save products: ${error.message}`, variant: 'destructive' });
      } finally {
        setIsSaving(false);
      }
    };
    
    const promptDelete = (type: 'product' | 'supplier', item: { id: string, name: string, isNew?: boolean }) => {
        if (type === 'product' && item.isNew) {
            setProducts(prev => prev.filter(p => p.id !== item.id));
            return;
        }
        setItemToDelete({ type, id: item.id, name: item.name });
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsSaving(true);
        if (itemToDelete.type === 'product') {
            await deleteDoc(doc(db, 'products', itemToDelete.id));
            toast({ title: "Success", description: "Product deleted successfully." });
        }
        // Supplier deletion logic can be added here if needed
        setItemToDelete(null);
        setIsSaving(false);
    };

    const inventoryStats = useMemo(() => {
        const totalProducts = products.length;
        const stockValue = products.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);
        const lowStockItems = products.filter(p => p.lowStockThreshold && p.quantity <= p.lowStockThreshold).length;
        return { totalProducts, stockValue, lowStockItems };
    }, [products]);
    
    if(authIsLoading || isLoading) {
        return <div className="p-8"><Skeleton className="h-[120px] w-full mb-6"/><Skeleton className="h-[400px] w-full"/></div>
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageTitle title="Inventory Management" subtitle="Track stock, sales, suppliers, and manage your products." icon={Package} />
            <div className="grid gap-6 md:grid-cols-3">
                <DataCard title="Total Products" value={inventoryStats.totalProducts.toString()} icon={ShoppingCart} />
                <DataCard title="Total Stock Value" value={`${currencySymbol}${inventoryStats.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={DollarSign} />
                <DataCard title="Low Stock Items" value={inventoryStats.lowStockItems.toString()} icon={AlertTriangle} className={inventoryStats.lowStockItems > 0 ? "bg-danger-card" : ""} />
            </div>

            <Tabs defaultValue="products">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <TabsList>
                        <TabsTrigger value="products">Products</TabsTrigger>
                        <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                    </TabsList>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button onClick={() => {}} className="flex-1 sm:flex-initial"><PlusCircle className="mr-2 h-4 w-4" /> Add Supplier</Button>
                        <Button onClick={handleSaveAllProducts} disabled={isSaving} className="flex-1 sm:flex-initial">
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />} Save All
                        </Button>
                    </div>
                </div>
                <TabsContent value="products">
                    <Card>
                        <div className="overflow-auto relative" style={{maxHeight: 'calc(100vh - 420px)'}}>
                          <Table>
                              <TableHeader className="sticky top-0 bg-card z-10">
                                  <TableRow>
                                      <TableHead className="w-[300px] sticky left-0 bg-card z-20">Product Name</TableHead>
                                      <TableHead>SKU</TableHead>
                                      <TableHead>Category</TableHead>
                                      <TableHead>Supplier</TableHead>
                                      <TableHead>Stock Qty</TableHead>
                                      <TableHead>Purchase Price</TableHead>
                                      <TableHead>Sale Price</TableHead>
                                      <TableHead>Low Stock Threshold</TableHead>
                                      <TableHead className="w-[50px] sticky right-0 bg-card z-20"></TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {productsWithNames.map(p => (
                                      <TableRow key={p.id}>
                                          <TableCell className="font-medium sticky left-0 bg-card group-hover:bg-muted">
                                            <Input value={p.name} onChange={e => handleProductInputChange(p.id, 'name', e.target.value)} placeholder="New Product Name" />
                                          </TableCell>
                                          <TableCell><Input value={p.sku} onChange={e => handleProductInputChange(p.id, 'sku', e.target.value)} placeholder="SKU" /></TableCell>
                                          <TableCell><Input value={p.category} onChange={e => handleProductInputChange(p.id, 'category', e.target.value)} placeholder="Category" /></TableCell>
                                          <TableCell>
                                            <Select value={p.supplierId || ''} onValueChange={val => handleProductInputChange(p.id, 'supplierId', val)}>
                                              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select supplier"/></SelectTrigger>
                                              <SelectContent>
                                                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                              </SelectContent>
                                            </Select>
                                          </TableCell>
                                          <TableCell><Input type="number" value={p.quantity} onChange={e => handleProductInputChange(p.id, 'quantity', e.target.value)} className="w-24"/></TableCell>
                                          <TableCell><Input type="number" value={p.purchasePrice} onChange={e => handleProductInputChange(p.id, 'purchasePrice', e.target.value)} className="w-28" /></TableCell>
                                          <TableCell><Input type="number" value={p.salePrice} onChange={e => handleProductInputChange(p.id, 'salePrice', e.target.value)} className="w-28" /></TableCell>
                                          <TableCell><Input type="number" value={p.lowStockThreshold} onChange={e => handleProductInputChange(p.id, 'lowStockThreshold', e.target.value)} className="w-28"/></TableCell>
                                          <TableCell className="sticky right-0 bg-card group-hover:bg-muted">
                                            <Button variant="ghost" size="icon" onClick={() => promptDelete('product', p)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                        </div>
                        <CardFooter className="pt-4">
                          <Button variant="outline" size="sm" onClick={handleAddProductRow}><PlusCircle className="mr-2 h-4 w-4" /> Add Product Row</Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
                 <TabsContent value="suppliers">
                    <Card>
                        <CardHeader><CardTitle>Supplier List</CardTitle><CardDescription>All your product suppliers.</CardDescription></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact Person</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {suppliers.map(s => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">{s.name}</TableCell>
                                            <TableCell>{s.contactPerson || 'N/A'}</TableCell>
                                            <TableCell>{s.email || 'N/A'}</TableCell>
                                            <TableCell>{s.phone || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                              {/* Dropdown for supplier actions can be added here */}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{itemToDelete?.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><Button variant="ghost" onClick={() => setItemToDelete(null)} disabled={isSaving}>Cancel</Button><Button onClick={confirmDelete} variant="destructive" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin mr-2"/> : null} Delete</Button></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
