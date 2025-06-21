
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Package, PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebaseConfig';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductFirestore {
  id?: string;
  name: string;
  description: string;
  price: number;
  companyId: string;
  createdAt: Timestamp;
}

interface ProductDisplay extends Omit<ProductFirestore, 'createdAt' | 'companyId'> {
  id: string;
  createdAt: Date;
}

export default function ProductsServicesPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const currency = user?.currencySymbol || '$';
  const [products, setProducts] = useState<ProductDisplay[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<ProductDisplay & { price?: string | number }>>({});
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (authIsLoading) {
      setIsLoadingProducts(true);
      return;
    }
    if (!user || !user.companyId) {
      setIsLoadingProducts(false);
      setProducts([]);
      return;
    }

    setIsLoadingProducts(true);
    try {
      const productsRef = collection(db, 'products');
      const q = query(productsRef, where('companyId', '==', user.companyId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedProducts = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<ProductFirestore, 'id'>;
        return {
          id: docSnap.id,
          name: data.name,
          description: data.description,
          price: data.price,
          createdAt: data.createdAt.toDate(),
        };
      });
      setProducts(fetchedProducts);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast({ title: 'Error Loading Products/Services', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [user, authIsLoading, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const resetFormState = () => {
    setIsFormOpen(false);
    setCurrentProduct({});
    setIsEditing(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.companyId) {
        toast({ title: "Authentication Error", description: "User not authenticated.", variant: "destructive" });
        return;
    }
    if (!currentProduct.name || currentProduct.price === undefined) {
        toast({ title: "Missing Information", description: "Name and price are required.", variant: "destructive" });
        return;
    }

    const priceNum = Number(currentProduct.price);
    if (isNaN(priceNum) || priceNum < 0) {
        toast({ title: "Invalid Price", description: "Price must be a non-negative number.", variant: "destructive"});
        return;
    }

    setIsSaving(true);
    
    const dataToSave = {
        name: currentProduct.name!,
        description: currentProduct.description || '',
        price: priceNum,
        companyId: user.companyId,
    };

    try {
        if (isEditing && currentProduct.id) {
            const productRef = doc(db, 'products', currentProduct.id);
            await updateDoc(productRef, { ...dataToSave, updatedAt: serverTimestamp() });
            toast({ title: "Item Updated" });
        } else {
            await addDoc(collection(db, 'products'), { ...dataToSave, createdAt: serverTimestamp() });
            toast({ title: "Item Added" });
        }
    
        fetchProducts();
        resetFormState();
    } catch (error: any) {
        console.error("Error saving item:", error);
        toast({ title: "Save Failed", description: `An unexpected error occurred: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const handleCreateNew = () => {
    setCurrentProduct({ price: '' });
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleEdit = (product: ProductDisplay) => {
    setCurrentProduct({ ...product, price: product.price.toString() });
    setIsEditing(true);
    setIsFormOpen(true);
  };
  
  const promptDelete = (id: string) => {
    setProductToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!productToDeleteId) return;
    setIsSaving(true);
    try {
      await deleteDoc(doc(db, 'products', productToDeleteId));
      toast({ title: "Item Deleted", variant: "destructive"});
      fetchProducts();
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive"});
    } finally {
      setIsSaving(false);
      setProductToDeleteId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentProduct(prev => ({ ...prev, [name]: value }));
  };

  if (authIsLoading) {
    return ( <div className="flex items-center justify-center h-[calc(100vh-200px)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <p className="ml-2">Loading authentication...</p></div> );
  }

  if (!user && !authIsLoading) {
     return (
      <div className="space-y-6">
        <PageTitle title="Products & Services" subtitle="Manage your catalog of billable items." icon={Package} />
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Access Denied</CardTitle></CardHeader>
          <CardContent><p>Please sign in to manage your products and services.</p></CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Products & Services" subtitle="Manage your catalog of billable items." icon={Package}>
        <Button onClick={handleCreateNew} disabled={isSaving || isLoadingProducts}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </PageTitle>

      <Table>
        <TableCaption>{products.length === 0 && !isLoadingProducts ? "No items found in your catalog." : "A list of your products and services."}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoadingProducts && products.length === 0 && (
            [...Array(3)].map((_, i) => (
              <TableRow key={`skel-${i}`}>
                <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-1/2" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-4 w-1/4 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
              </TableRow>
            ))
          )}

          {!isLoadingProducts && products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-sm truncate">{product.description}</TableCell>
              <TableCell className="text-right">{currency}{product.price.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isSaving}><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(product)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => promptDelete(product.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) resetFormState(); else setIsFormOpen(true); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">{isEditing ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription>{isEditing ? 'Update item details.' : 'Fill in the new item details for your catalog.'}</DialogDescription>
          </DialogHeader>
          
          <form id="productDialogForm" onSubmit={handleFormSubmit} className="space-y-4 py-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" value={currentProduct.name || ''} onChange={handleInputChange} required disabled={isSaving} placeholder="e.g., Website Maintenance" />
            </div>
            <div>
              <Label htmlFor="price">Price ({currency})</Label>
              <Input id="price" name="price" type="number" value={currentProduct.price === undefined ? '' : String(currentProduct.price)} onChange={handleInputChange} required min="0" disabled={isSaving} placeholder="e.g., 150.00" />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea id="description" name="description" value={currentProduct.description || ''} onChange={handleInputChange} rows={3} disabled={isSaving} placeholder="e.g., Monthly fee for website updates and security." />
            </div>
          </form>

          <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" onClick={resetFormState} disabled={isSaving}>Cancel</Button>
              </DialogClose>
              <Button type="submit" form="productDialogForm" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Item')}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the item from your catalog. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProductToDeleteId(null)} disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
