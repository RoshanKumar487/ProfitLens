
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, PlusCircle, Trash2, Loader2, Save, Search, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { saveAllProducts, deleteProduct } from './actions';

type ProductDisplay = {
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
  isNew?: boolean;
};

const UNITS_OF_MEASURE = [
    'pcs', 'nos', 'kg', 'g', 'ltr', 'ml', 'm', 'ft', 'in', 'box', 'set', 'pair', 'dozen'
];

export default function ProductsServicesPage() {
    const { user, currencySymbol, isLoading: authIsLoading } = useAuth();
    const { toast } = useToast();

    const [products, setProducts] = useState<ProductDisplay[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<ProductDisplay | null>(null);

    // New state for filtering and sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof ProductDisplay; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

    useEffect(() => {
        if (!user || !user.companyId) {
            setIsLoading(false);
            return;
        }

        const productQuery = query(collection(db, 'products'), where('companyId', '==', user.companyId));

        const unsubProducts = onSnapshot(productQuery, (snapshot) => {
            const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductDisplay));
            setProducts(fetchedProducts);
            setIsLoading(false);
        }, (error) => { 
            console.error("Error fetching products:", error); 
            toast({ variant: 'destructive', title: "Error", description: "Could not fetch products." }); 
            setIsLoading(false);
        });
        
        return () => unsubProducts();
    }, [user?.companyId, toast]);
    
    const filteredAndSortedProducts = useMemo(() => {
        let sortableItems = [...products];

        if (searchTerm) {
            sortableItems = sortableItems.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        sortableItems.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
            }

            return 0;
        });

        return sortableItems;
    }, [products, searchTerm, sortConfig]);

    const handleSort = (key: keyof ProductDisplay) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof ProductDisplay) => {
        if (sortConfig.key !== key) {
            return <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />;
        }
        return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
    };

    const handleProductInputChange = (productId: string, field: keyof ProductDisplay, value: any) => {
      setProducts(prev =>
        prev.map(p => {
          if (p.id === productId) {
            const parsedValue = ['purchasePrice', 'salePrice', 'gstRate', 'quantity', 'lowStockThreshold'].includes(field as string)
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
        itemType: 'Goods',
        unit: 'pcs',
        salePrice: 0,
        purchasePrice: 0,
        gstRate: 0,
        quantity: 0,
        lowStockThreshold: 10,
      };
      setProducts(prev => [...prev, newProduct]);
    };
    
    const handleSaveAllProducts = async () => {
      if (!user?.companyId) return;
      setIsSaving(true);
      
      const result = await saveAllProducts(products, user.companyId);
      
      toast({
        title: result.success ? "Success" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      
      setIsSaving(false);
    };
    
    const promptDelete = (item: ProductDisplay) => {
        if (item.isNew) {
            setProducts(prev => prev.filter(p => p.id !== item.id));
            return;
        }
        setItemToDelete(item);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsSaving(true);
        const result = await deleteProduct(itemToDelete.id);

        toast({
            title: result.success ? "Success" : "Error",
            description: result.message,
            variant: result.success ? "default" : "destructive",
        });

        setItemToDelete(null);
        setIsSaving(false);
    };
    
    const totals = React.useMemo(() => {
        return filteredAndSortedProducts.reduce((acc, p) => {
            if (p.itemType === 'Goods') {
                acc.stockValue += (p.quantity ?? 0) * p.purchasePrice;
                acc.stockQuantity += (p.quantity ?? 0);
            }
            return acc;
        }, { stockValue: 0, stockQuantity: 0 });
    }, [filteredAndSortedProducts]);


    if(authIsLoading || isLoading) {
        return (
            <div className="space-y-6 p-4 sm:p-6 lg:p-8">
                <PageTitle title="Products & Services" subtitle="Manage your entire catalog of goods and services." icon={Package} />
                <Card><CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                <CardContent><Skeleton className="h-[400px] w-full"/></CardContent></Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            <PageTitle title="Products & Services" subtitle="Manage your entire catalog of goods, services, and stock levels." icon={Package} />
            
            <Card>
                 <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>Item Master</CardTitle>
                            <CardDescription>This is your master list of all items you buy, sell, and stock.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                           <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Filter by item name..." 
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleSaveAllProducts} disabled={isSaving} className="w-full sm:w-auto">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />} Save All
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-auto relative" style={{maxHeight: 'calc(100vh - 380px)'}}>
                    <Table>
                        <TableHeader className="sticky top-0 bg-card z-10">
                            <TableRow>
                                <TableHead className="w-[300px] sticky left-0 bg-card z-20">
                                    <Button variant="ghost" className="-ml-4 h-8" onClick={() => handleSort('name')}>Item Name {getSortIcon('name')}</Button>
                                </TableHead>
                                <TableHead><Button variant="ghost" className="-ml-4 h-8" onClick={() => handleSort('sku')}>SKU {getSortIcon('sku')}</Button></TableHead>
                                <TableHead><Button variant="ghost" className="-ml-4 h-8" onClick={() => handleSort('category')}>Category {getSortIcon('category')}</Button></TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead><Button variant="ghost" className="-ml-4 h-8" onClick={() => handleSort('salePrice')}>Sale Price ({currencySymbol}) {getSortIcon('salePrice')}</Button></TableHead>
                                <TableHead><Button variant="ghost" className="-ml-4 h-8" onClick={() => handleSort('purchasePrice')}>Purchase Price ({currencySymbol}) {getSortIcon('purchasePrice')}</Button></TableHead>
                                <TableHead>GST Rate (%)</TableHead>
                                <TableHead><Button variant="ghost" className="-ml-4 h-8" onClick={() => handleSort('quantity')}>Stock Qty {getSortIcon('quantity')}</Button></TableHead>
                                <TableHead>Low Stock Alert</TableHead>
                                <TableHead>Stock Value ({currencySymbol})</TableHead>
                                <TableHead className="w-[50px] sticky right-0 bg-card z-20"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAndSortedProducts.map(p => {
                              const isGoods = p.itemType === 'Goods';
                              const stockValue = isGoods ? (p.quantity || 0) * p.purchasePrice : 0;
                              
                              return (
                                <TableRow key={p.id} className="group">
                                    <TableCell className="font-medium sticky left-0 bg-card group-hover:bg-muted">
                                    <Input value={p.name} onChange={e => handleProductInputChange(p.id, 'name', e.target.value)} placeholder="New Item Name" />
                                    </TableCell>
                                    <TableCell><Input value={p.sku} onChange={e => handleProductInputChange(p.id, 'sku', e.target.value)} placeholder="SKU" /></TableCell>
                                    <TableCell><Input value={p.category} onChange={e => handleProductInputChange(p.id, 'category', e.target.value)} placeholder="e.g., Electronics" /></TableCell>
                                    <TableCell>
                                        <Select value={p.itemType} onValueChange={val => handleProductInputChange(p.id, 'itemType', val)}>
                                            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="Goods">Goods</SelectItem><SelectItem value="Service">Service</SelectItem></SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select value={p.unit} onValueChange={val => handleProductInputChange(p.id, 'unit', val)}>
                                            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>{UNITS_OF_MEASURE.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell><Input type="number" value={p.salePrice} onChange={e => handleProductInputChange(p.id, 'salePrice', e.target.value)} className="w-28" /></TableCell>
                                    <TableCell><Input type="number" value={p.purchasePrice} onChange={e => handleProductInputChange(p.id, 'purchasePrice', e.target.value)} className="w-28" /></TableCell>
                                    <TableCell><Input type="number" value={p.gstRate} onChange={e => handleProductInputChange(p.id, 'gstRate', e.target.value)} className="w-24"/></TableCell>
                                    <TableCell><Input type="number" value={p.quantity ?? ''} onChange={e => handleProductInputChange(p.id, 'quantity', e.target.value)} className="w-24" disabled={!isGoods} /></TableCell>
                                    <TableCell><Input type="number" value={p.lowStockThreshold ?? ''} onChange={e => handleProductInputChange(p.id, 'lowStockThreshold', e.target.value)} className="w-28" disabled={!isGoods} /></TableCell>
                                    <TableCell className="font-semibold text-right">{isGoods ? stockValue.toFixed(2) : 'N/A'}</TableCell>
                                    <TableCell className="sticky right-0 bg-card group-hover:bg-muted">
                                    <Button variant="ghost" size="icon" onClick={() => promptDelete(p)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </TableCell>
                                </TableRow>
                              )
                            })}
                        </TableBody>
                        <TableFooter className="sticky bottom-0 bg-muted z-10">
                            <TableRow>
                                <TableCell colSpan={8} className="font-bold text-right">Totals</TableCell>
                                <TableCell className="font-bold text-center">{totals.stockQuantity}</TableCell>
                                <TableCell colSpan={2} className="font-bold text-right">{currencySymbol}{totals.stockValue.toFixed(2)}</TableCell>
                                <TableCell className="sticky right-0 bg-muted"></TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                    </div>
                </CardContent>
                <CardFooter className="pt-4">
                    <Button variant="outline" size="sm" onClick={handleAddProductRow}><PlusCircle className="mr-2 h-4 w-4" /> Add Item</Button>
                </CardFooter>
            </Card>

            <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{itemToDelete?.name}". This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <Button variant="ghost" onClick={() => setItemToDelete(null)} disabled={isSaving}>Cancel</Button>
                        <Button onClick={confirmDelete} variant="destructive" disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin mr-2"/> : null} 
                            Delete
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
