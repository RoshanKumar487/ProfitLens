
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import PageTitle from '@/components/PageTitle';
import DataCard from '@/components/DataCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Save, ShoppingCart, DollarSign, Warehouse, AlertTriangle } from 'lucide-react';
import { saveProduct, deleteProduct, saveSupplier, deleteSupplier, adjustStock, type Product, type Supplier } from './actions';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ProductDisplay = Product & { id: string; supplierName?: string };

export default function InventoryPage() {
    const { user, currencySymbol, isLoading: authIsLoading } = useAuth();
    const { toast } = useToast();

    // Data State
    const [products, setProducts] = useState<ProductDisplay[]>([]);
    const [suppliers, setSuppliers] = useState<(Supplier & { id: string })[]>([]);
    
    // Loading State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Dialogs and Forms State
    const [dialogOpen, setDialogOpen] = useState<'product' | 'supplier' | 'stock' | null>(null);
    const [itemToEdit, setItemToEdit] = useState<Partial<Product & Supplier>>({});
    const [itemToDelete, setItemToDelete] = useState<{ type: 'product' | 'supplier'; id: string; name: string } | null>(null);
    const [stockAdjustment, setStockAdjustment] = useState<{ productId: string; productName: string; quantity: number; type: 'Purchase' | 'Sale' | 'Correction' }>({ productId: '', productName: '', quantity: 1, type: 'Purchase' });

    // Fetch data using real-time listeners
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
            if (suppliers.length > 0 || suppliers.length === 0) setIsLoading(false);
        }, (error) => { console.error("Error fetching products:", error); toast({ variant: 'destructive', title: "Error", description: "Could not fetch products." }); });

        const unsubSuppliers = onSnapshot(supplierQuery, (snapshot) => {
            const fetchedSuppliers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (Supplier & { id: string })));
            setSuppliers(fetchedSuppliers);
            setIsLoading(false);
        }, (error) => { console.error("Error fetching suppliers:", error); toast({ variant: 'destructive', title: "Error", description: "Could not fetch suppliers." }); });
        
        return () => { unsubProducts(); unsubSuppliers(); };
    }, [user?.companyId, toast]);
    
    // Memoize products with supplier names for display
    const productsWithNames = useMemo(() => {
        const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
        return products.map(p => ({ ...p, supplierName: p.supplierId ? supplierMap.get(p.supplierId) : 'N/A' }));
    }, [products, suppliers]);
    
    // Dialog and Form Handlers
    const handleOpenDialog = (type: 'product' | 'supplier', item?: Product | Supplier) => {
        setItemToEdit(item || (type === 'product' ? { name: '', purchasePrice: 0, salePrice: 0, quantity: 0 } : { name: '' }));
        setDialogOpen(type);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.companyId || !itemToEdit || !dialogOpen || dialogOpen === 'stock') return;
        setIsSaving(true);
        const result = dialogOpen === 'product'
            ? await saveProduct(user.companyId, itemToEdit as Product)
            : await saveSupplier(user.companyId, itemToEdit as Supplier);
        
        toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
        if (result.success) setDialogOpen(null);
        setIsSaving(false);
    };

    const handleOpenStockDialog = (product: ProductDisplay) => {
        setStockAdjustment({ productId: product.id, productName: product.name, quantity: 1, type: 'Purchase' });
        setDialogOpen('stock');
    };

    const handleStockAdjustmentSubmit = async () => {
        setIsSaving(true);
        const adjustment = stockAdjustment.type === 'Sale' ? -stockAdjustment.quantity : stockAdjustment.quantity;
        const result = await adjustStock(stockAdjustment.productId, adjustment, stockAdjustment.type);
        toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
        if (result.success) setDialogOpen(null);
        setIsSaving(false);
    };

    // Deletion Handlers
    const promptDelete = (type: 'product' | 'supplier', item: { id: string, name: string }) => {
        setItemToDelete({ type, id: item.id, name: item.name });
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsSaving(true);
        const result = itemToDelete.type === 'product'
            ? await deleteProduct(itemToDelete.id)
            : await deleteSupplier(itemToDelete.id);
        
        toast({ title: result.success ? 'Success' : 'Error', description: result.message, variant: result.success ? 'default' : 'destructive' });
        setItemToDelete(null);
        setIsSaving(false);
    };

    // Aggregate data for DataCards
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
                        <Button onClick={() => handleOpenDialog('supplier')} className="flex-1 sm:flex-initial"><PlusCircle className="mr-2 h-4 w-4" /> Add Supplier</Button>
                        <Button onClick={() => handleOpenDialog('product')} className="flex-1 sm:flex-initial"><PlusCircle className="mr-2 h-4 w-4" /> Add Product</Button>
                    </div>
                </div>
                <TabsContent value="products">
                    <Card>
                        <CardHeader className="hidden md:block">
                            <CardTitle>Product List</CardTitle>
                            <CardDescription>All products in your inventory.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Desktop Table */}
                            <Table className="hidden md:table">
                                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Supplier</TableHead><TableHead>Stock Qty</TableHead><TableHead>Sale Price</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {productsWithNames.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.name} {p.sku && <span className="text-xs text-muted-foreground">({p.sku})</span>}</TableCell>
                                            <TableCell>{p.category || 'N/A'}</TableCell>
                                            <TableCell>{p.supplierName}</TableCell>
                                            <TableCell><Badge variant={p.lowStockThreshold && p.quantity <= p.lowStockThreshold ? 'destructive' : 'secondary'}>{p.quantity}</Badge></TableCell>
                                            <TableCell>{currencySymbol}{p.salePrice.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" className="mr-2" onClick={() => handleOpenStockDialog(p)}>Adjust Stock</Button>
                                                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal/></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={()=>handleOpenDialog('product', p)}>Edit</DropdownMenuItem><DropdownMenuItem onClick={()=>promptDelete('product', p)} className="text-destructive">Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {/* Mobile Card List */}
                            <div className="md:hidden space-y-4">
                                {productsWithNames.map(p => (
                                    <Card key={p.id}>
                                        <CardContent className="p-4 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold">{p.name}</h3>
                                                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2"><MoreHorizontal/></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={()=>handleOpenDialog('product', p)}>Edit</DropdownMenuItem><DropdownMenuItem onClick={()=>promptDelete('product', p)} className="text-destructive">Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                            </div>
                                            <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4">
                                                <p><strong>Price:</strong> {currencySymbol}{p.salePrice.toFixed(2)}</p>
                                                <p><strong>Category:</strong> {p.category || 'N/A'}</p>
                                                <p><strong>Supplier:</strong> {p.supplierName}</p>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t mt-2">
                                                <Badge variant={p.lowStockThreshold && p.quantity <= p.lowStockThreshold ? 'destructive' : 'secondary'}>In Stock: {p.quantity}</Badge>
                                                <Button variant="outline" size="sm" onClick={() => handleOpenStockDialog(p)}>Adjust Stock</Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="suppliers">
                    <Card>
                        <CardHeader className="hidden md:block">
                            <CardTitle>Supplier List</CardTitle>
                            <CardDescription>All your product suppliers.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Desktop Table */}
                            <Table className="hidden md:table">
                                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact Person</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {suppliers.map(s => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">{s.name}</TableCell>
                                            <TableCell>{s.contactPerson || 'N/A'}</TableCell>
                                            <TableCell>{s.email || 'N/A'}</TableCell>
                                            <TableCell>{s.phone || 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal/></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent><DropdownMenuItem onClick={()=>handleOpenDialog('supplier', s)}>Edit</DropdownMenuItem><DropdownMenuItem onClick={()=>promptDelete('supplier', s)} className="text-destructive">Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {/* Mobile Card List */}
                             <div className="md:hidden space-y-4">
                                {suppliers.map(s => (
                                    <Card key={s.id}>
                                        <CardContent className="p-4 space-y-2">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold">{s.name}</h3>
                                                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2"><MoreHorizontal/></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={()=>handleOpenDialog('supplier', s)}>Edit</DropdownMenuItem><DropdownMenuItem onClick={()=>promptDelete('supplier', s)} className="text-destructive">Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                            </div>
                                            <div className="text-sm text-muted-foreground space-y-1">
                                                <p><strong>Contact:</strong> {s.contactPerson || 'N/A'}</p>
                                                <p><strong>Email:</strong> {s.email || 'N/A'}</p>
                                                <p><strong>Phone:</strong> {s.phone || 'N/A'}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Product/Supplier Dialog */}
            <Dialog open={dialogOpen === 'product' || dialogOpen === 'supplier'} onOpenChange={(open) => !open && setDialogOpen(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{itemToEdit?.id ? 'Edit' : 'Add'} {dialogOpen === 'product' ? 'Product' : 'Supplier'}</DialogTitle>
                    </DialogHeader>
                    <form id="itemForm" onSubmit={handleFormSubmit} className="space-y-4 pt-4">
                        {dialogOpen === 'product' && (
                           <div className="space-y-4">
                                <div><Label>Product Name</Label><Input value={(itemToEdit as Product)?.name || ''} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} placeholder="e.g., T-Shirt" required disabled={isSaving}/></div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><Label>SKU</Label><Input value={(itemToEdit as Product)?.sku || ''} onChange={e => setItemToEdit({...itemToEdit, sku: e.target.value})} placeholder="Optional" disabled={isSaving}/></div>
                                    <div><Label>Category</Label><Input value={(itemToEdit as Product)?.category || ''} onChange={e => setItemToEdit({...itemToEdit, category: e.target.value})} placeholder="e.g., Apparel" disabled={isSaving}/></div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><Label>Purchase Price ({currencySymbol})</Label><Input type="number" value={(itemToEdit as Product)?.purchasePrice ?? ''} onChange={e => setItemToEdit({...itemToEdit, purchasePrice: parseFloat(e.target.value) || 0})} required disabled={isSaving}/></div>
                                    <div><Label>Sale Price ({currencySymbol})</Label><Input type="number" value={(itemToEdit as Product)?.salePrice ?? ''} onChange={e => setItemToEdit({...itemToEdit, salePrice: parseFloat(e.target.value) || 0})} required disabled={isSaving}/></div>
                                </div>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><Label>Initial Quantity</Label><Input type="number" value={(itemToEdit as Product)?.quantity ?? ''} onChange={e => setItemToEdit({...itemToEdit, quantity: parseInt(e.target.value, 10) || 0})} required disabled={isSaving}/></div>
                                    <div><Label>Low Stock Alert</Label><Input type="number" value={(itemToEdit as Product)?.lowStockThreshold || ''} onChange={e => setItemToEdit({...itemToEdit, lowStockThreshold: parseInt(e.target.value, 10) || undefined})} placeholder="e.g. 10" disabled={isSaving}/></div>
                                </div>
                                 <Select value={(itemToEdit as Product)?.supplierId || ''} onValueChange={val => setItemToEdit({...itemToEdit, supplierId: val})} disabled={isSaving}>
                                    <SelectTrigger><SelectValue placeholder="Select a supplier (optional)"/></SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                           </div>
                        )}
                         {dialogOpen === 'supplier' && (
                            <div className="space-y-4">
                                <div><Label>Supplier Name</Label><Input value={(itemToEdit as Supplier)?.name || ''} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} placeholder="e.g., ACME Inc." required disabled={isSaving}/></div>
                                <div><Label>Contact Person</Label><Input value={(itemToEdit as Supplier)?.contactPerson || ''} onChange={e => setItemToEdit({...itemToEdit, contactPerson: e.target.value})} placeholder="Optional" disabled={isSaving}/></div>
                                <div><Label>Email</Label><Input type="email" value={(itemToEdit as Supplier)?.email || ''} onChange={e => setItemToEdit({...itemToEdit, email: e.target.value})} placeholder="Optional" disabled={isSaving}/></div>
                                <div><Label>Phone</Label><Input value={(itemToEdit as Supplier)?.phone || ''} onChange={e => setItemToEdit({...itemToEdit, phone: e.target.value})} placeholder="Optional" disabled={isSaving}/></div>
                            </div>
                         )}
                    </form>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(null)} disabled={isSaving}>Cancel</Button>
                        <Button type="submit" form="itemForm" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin mr-2"/> : null} Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Stock Adjustment Dialog */}
            <Dialog open={dialogOpen === 'stock'} onOpenChange={() => setDialogOpen(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Adjust Stock for {stockAdjustment.productName}</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-4">
                        <Label>Adjustment Type</Label>
                        <Select value={stockAdjustment.type} onValueChange={v => setStockAdjustment({...stockAdjustment, type: v as any})}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent><SelectItem value="Purchase">Add Stock (Purchase)</SelectItem><SelectItem value="Sale">Remove Stock (Sale)</SelectItem><SelectItem value="Correction">Correction</SelectItem></SelectContent>
                        </Select>
                        <Label>Quantity</Label>
                        <Input type="number" value={stockAdjustment.quantity} onChange={e => setStockAdjustment({...stockAdjustment, quantity: parseInt(e.target.value, 10) || 0})} min="1"/>
                    </div>
                     <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(null)} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleStockAdjustmentSubmit} disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin mr-2"/> : null} Adjust Stock</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the {itemToDelete?.type} "{itemToDelete?.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><Button variant="ghost" onClick={() => setItemToDelete(null)} disabled={isSaving}>Cancel</Button><Button onClick={confirmDelete} variant="destructive" disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin mr-2"/> : null} Delete</Button></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
