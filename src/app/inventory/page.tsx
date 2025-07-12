
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Warehouse, PlusCircle, Trash2, Loader2, Save, ShoppingCart, DollarSign, AlertTriangle } from 'lucide-react';
import { saveSupplier, deleteSupplier, type Supplier } from './actions';
import { v4 as uuidv4 } from 'uuid';

// This is now for stock tracking
type InventoryItemDisplay = {
  id: string; // This is the product ID
  name: string;
  sku: string;
  category: string;
  purchasePrice: number;
  quantity: number;
  lowStockThreshold: number;
  supplierId: string;
  supplierName?: string;
};

type SupplierDisplay = Supplier & { id: string };

export default function InventoryPage() {
    const { user, currencySymbol, isLoading: authIsLoading } = useAuth();
    const { toast } = useToast();

    const [inventory, setInventory] = useState<InventoryItemDisplay[]>([]);
    const [suppliers, setSuppliers] = useState<SupplierDisplay[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [itemToDelete, setItemToDelete] = useState<{ type: 'product' | 'supplier'; id: string; name: string } | null>(null);

    useEffect(() => {
        if (!user || !user.companyId) {
            setIsLoading(false);
            return;
        }

        // Query only 'Goods' for stock management
        const productQuery = query(
            collection(db, 'products'), 
            where('companyId', '==', user.companyId), 
            where('itemType', '==', 'Goods'), 
            orderBy('name')
        );
        const supplierQuery = query(collection(db, 'suppliers'), where('companyId', '==', user.companyId), orderBy('name'));

        const unsubProducts = onSnapshot(productQuery, (snapshot) => {
            const fetchedInventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItemDisplay));
            setInventory(fetchedInventory);
            if (!suppliers.length || snapshot.docs.length > 0) setIsLoading(false);
        }, (error) => { console.error("Error fetching inventory:", error); toast({ variant: 'destructive', title: "Error", description: "Could not fetch inventory." }); });

        const unsubSuppliers = onSnapshot(supplierQuery, (snapshot) => {
            const fetchedSuppliers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierDisplay));
            setSuppliers(fetchedSuppliers);
            if (!inventory.length || snapshot.docs.length > 0) setIsLoading(false);
        }, (error) => { console.error("Error fetching suppliers:", error); toast({ variant: 'destructive', title: "Error", description: "Could not fetch suppliers." }); });
        
        return () => { unsubProducts(); unsubSuppliers(); };
    }, [user?.companyId, toast]);
    
    const inventoryWithNames = useMemo(() => {
        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
        return inventory.map(p => ({ ...p, supplierName: p.supplierId ? supplierMap.get(p.supplierId) : 'N/A' }));
    }, [inventory, suppliers]);

    const handleStockInputChange = (productId: string, field: 'quantity' | 'lowStockThreshold', value: any) => {
      setInventory(prev =>
        prev.map(p => {
          if (p.id === productId) {
            return { ...p, [field]: parseFloat(value) || 0 };
          }
          return p;
        })
      );
    };
    
    const handleSaveStockLevels = async () => {
      if (!user?.companyId) return;
      setIsSaving(true);
      const batch = writeBatch(db);
      
      inventory.forEach(item => {
        const productRef = doc(db, 'products', item.id);
        batch.update(productRef, {
          quantity: item.quantity,
          lowStockThreshold: item.lowStockThreshold,
          updatedAt: serverTimestamp()
        });
      });

      try {
        await batch.commit();
        toast({ title: "Success", description: "Stock levels updated successfully." });
      } catch (error: any) {
        toast({ title: "Error", description: `Failed to update stock: ${error.message}`, variant: 'destructive' });
      } finally {
        setIsSaving(false);
      }
    };
    
    const promptDelete = (type: 'supplier', item: { id: string, name: string }) => {
        setItemToDelete({ type, id: item.id, name: item.name });
    };

    const confirmDelete = async () => {
        if (!itemToDelete || itemToDelete.type !== 'supplier') return;
        setIsSaving(true);
        // Add supplier deletion logic here if needed
        await deleteSupplier(itemToDelete.id);
        toast({ title: "Success", description: "Supplier deleted successfully." });
        setItemToDelete(null);
        setIsSaving(false);
    };

    const inventoryStats = useMemo(() => {
        const totalProducts = inventory.length;
        const stockValue = inventory.reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);
        const lowStockItems = inventory.filter(p => p.lowStockThreshold && p.quantity <= p.lowStockThreshold).length;
        return { totalProducts, stockValue, lowStockItems };
    }, [inventory]);
    
    if(authIsLoading || isLoading) {
        return <div className="p-8"><Skeleton className="h-[120px] w-full mb-6"/><Skeleton className="h-[400px] w-full"/></div>
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageTitle title="Stock Management" subtitle="Track stock levels, suppliers, and inventory value." icon={Warehouse} />
            <div className="grid gap-6 md:grid-cols-3">
                <DataCard title="Stock Items" value={inventoryStats.totalProducts.toString()} icon={ShoppingCart} />
                <DataCard title="Total Stock Value" value={`${currencySymbol}${inventoryStats.stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={DollarSign} />
                <DataCard title="Low Stock Items" value={inventoryStats.lowStockItems.toString()} icon={AlertTriangle} className={inventoryStats.lowStockItems > 0 ? "bg-danger-card" : ""} />
            </div>

            <Tabs defaultValue="stock">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <TabsList>
                        <TabsTrigger value="stock">Stock Levels</TabsTrigger>
                        <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                    </TabsList>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button onClick={() => {}} className="flex-1 sm:flex-initial"><PlusCircle className="mr-2 h-4 w-4" /> Add Supplier</Button>
                        <Button onClick={handleSaveStockLevels} disabled={isSaving} className="flex-1 sm:flex-initial">
                          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />} Save Stock Levels
                        </Button>
                    </div>
                </div>
                <TabsContent value="stock">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Inventory</CardTitle>
                            <CardDescription>View and manage the stock levels of your goods.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-auto relative" style={{maxHeight: 'calc(100vh - 420px)'}}>
                            <Table>
                                <TableHeader className="sticky top-0 bg-card z-10">
                                    <TableRow>
                                        <TableHead className="w-[300px] sticky left-0 bg-card z-20">Product Name</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>Stock Qty</TableHead>
                                        <TableHead>Low Stock Threshold</TableHead>
                                        <TableHead>Purchase Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inventoryWithNames.map(p => (
                                        <TableRow key={p.id} className="group">
                                            <TableCell className="font-medium sticky left-0 bg-card group-hover:bg-muted">{p.name}</TableCell>
                                            <TableCell>{p.sku}</TableCell>
                                            <TableCell>{p.category}</TableCell>
                                            <TableCell>{p.supplierName}</TableCell>
                                            <TableCell><Input type="number" value={p.quantity} onChange={e => handleStockInputChange(p.id, 'quantity', e.target.value)} className="w-24"/></TableCell>
                                            <TableCell><Input type="number" value={p.lowStockThreshold} onChange={e => handleStockInputChange(p.id, 'lowStockThreshold', e.target.value)} className="w-28"/></TableCell>
                                            <TableCell>{currencySymbol}{p.purchasePrice.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                          </div>
                        </CardContent>
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
                                              <Button variant="ghost" size="icon" onClick={() => promptDelete('supplier', s)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
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
