
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { NAV_ITEMS } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, Loader2, Building, LayoutTemplate, Bell, Bot, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AssistantChat } from '@/components/AssistantChat';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { Badge } from '@/components/ui/badge';

const AppShellLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { user, signOut, isLoading: authLoading } = useAuth(); 
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);
  const [pendingRequestCount, setPendingRequestCount] = React.useState(0);
  
  React.useEffect(() => {
    if (user?.role !== 'admin' || !user?.companyId) {
      setPendingRequestCount(0);
      return;
    }

    const requestsRef = collection(db, 'accessRequests');
    const q = query(
      requestsRef,
      where('companyId', '==', user.companyId),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingRequestCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching pending request count:", error);
    });

    return () => unsubscribe();
  }, [user]);
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.trim().split(/\s+/);
    if (names.length === 0 || names[0] === '') return 'U';
    
    const firstInitial = names[0][0];
    const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
    
    return (firstInitial + lastInitial).toUpperCase();
  };

  const handleNavigationClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isAuthPage = pathname.startsWith('/auth/');
  
  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter(item => {
      if (item.sidebar === false) {
        return false;
      }
      if (item.href === '/admin') {
        return user?.role === 'admin';
      }
      return true;
    });
  }, [user]);

  return (
    <>
      {!isAuthPage && (
        <Sidebar collapsible="icon" variant="sidebar" className="border-r">
          <SidebarHeader className="p-2">
            <Button
              variant="ghost"
              className="h-12 w-full justify-start gap-3 px-3 group-data-[collapsible=icon]:justify-center"
              asChild
            >
             <Link href="/">
                <LayoutTemplate className="h-7 w-7 shrink-0 text-primary" />
                <h1 className="text-xl font-headline font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                  ProfitLens
                </h1>
              </Link>
            </Button>
            {user && user.companyName && (
              <div className="mt-1 px-2 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-2 rounded-md bg-primary/10 p-2 shadow-inner">
                  <Building className="h-4 w-4 flex-shrink-0 text-primary/80" />
                  <p className="truncate text-sm font-semibold text-primary">{user.companyName}</p>
                </div>
              </div>
            )}
          </SidebarHeader>
          <Separator className="bg-sidebar-border" />
          <SidebarContent className="p-2">
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                    tooltip={{ children: item.label, side: 'right', className: 'bg-card text-card-foreground' }}
                    className="justify-start group-data-[collapsible=icon]:justify-center"
                    disabled={authLoading} 
                  >
                    <Link href={item.href} onClick={handleNavigationClick}>
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                       {item.href === '/admin' && pendingRequestCount > 0 && (
                          <Badge variant="destructive" className="ml-auto group-data-[collapsible=icon]:hidden">
                            {pendingRequestCount}
                          </Badge>
                       )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      )}

      <SidebarInset className={cn(isAuthPage && "md:!ml-0")}>
        {!isAuthPage && (
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
              <div className="flex items-center gap-4">
                  {/* Mobile trigger */}
                  <SidebarTrigger variant="outline" size="icon" className="md:hidden" />
                  
                  {/* Brand logo/name */}
                  <Link href="/" onClick={handleNavigationClick} className="flex items-center gap-2">
                      <LayoutTemplate className="h-6 w-6 text-primary" />
                      <span className="font-bold text-lg text-foreground">ProfitLens</span>
                  </Link>
              </div>

              <div className="flex-1" />

              {user && (
                  <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full">
                          <Bell className="h-5 w-5" />
                           {pendingRequestCount > 0 && (
                            <Badge variant="destructive" className="absolute top-1 right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                                {pendingRequestCount}
                            </Badge>
                          )}
                      </Button>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                                  <Avatar className="h-10 w-10">
                                      <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                                          {getInitials(user.displayName)}
                                      </AvatarFallback>
                                  </Avatar>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56" align="end" forceMount>
                              <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                  <p className="text-sm font-medium leading-none">{user.displayName}</p>
                                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                                </div>
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                  <Link href="/company-details" className="cursor-pointer">
                                      <Building className="mr-2 h-4 w-4" />
                                      <span>Company Details</span>
                                  </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href="/guide" className="cursor-pointer">
                                  <HelpCircle className="mr-2 h-4 w-4" />
                                  <span>Guide</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive cursor-pointer">
                                <LogOut className="mr-2 h-4 w-4" /> Sign Out
                              </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
              )}
          </header>
        )}
        <main className="flex-1">
          {authLoading ? (
             <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
             </div>
           ) : children}
        </main>
      </SidebarInset>
      
      {!isAuthPage && !authLoading && user && (
        <Dialog open={isAssistantOpen} onOpenChange={setIsAssistantOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button className="fixed bottom-4 right-4 h-10 w-10 rounded-full shadow-2xl z-50">
                  <Bot className="h-5 w-5" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>AI Assistant</p>
            </TooltipContent>
          </Tooltip>
          <DialogContent className="sm:max-w-2xl h-[calc(100vh-8rem)] flex flex-col p-0 gap-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-6 w-6 text-primary"/>
                AI Assistant
              </DialogTitle>
              <DialogDescription>
                Ask me to add employees, update invoices, or generate financial summaries.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0">
              <AssistantChat />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppShellLayout>{children}</AppShellLayout>
    </SidebarProvider>
  );
};

export default AppShell;
