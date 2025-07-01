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
import { LogOut, Loader2, Building, LayoutTemplate, Bell, Bot, HelpCircle, User, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AssistantChat } from '@/components/AssistantChat';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  userName: string;
  createdAt: Timestamp;
}

const AppShellLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { user, signOut, isLoading: authLoading } = useAuth(); 
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);
  const [pendingRequestCount, setPendingRequestCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  
  React.useEffect(() => {
    if (user?.role !== 'admin' || !user?.companyId) {
      setPendingRequestCount(0);
      setNotifications([]);
      return;
    }

    const requestsRef = collection(db, 'accessRequests');
    const q = query(
      requestsRef,
      where('companyId', '==', user.companyId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            userName: data.userName,
            createdAt: data.createdAt as Timestamp,
        };
      });
      setNotifications(fetchedNotifications);
      setPendingRequestCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching pending requests:", error);
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
      if (item.href === '/super-admin') {
        return user?.isSuperAdmin;
      }
      return true;
    });
  }, [user]);
  
  const Logo = () => (
    <Button
      variant="ghost"
      className="h-14 w-full justify-start gap-3 px-4 text-lg font-bold hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:px-0"
      asChild
    >
      <Link href="/">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-400 to-purple-500 text-white shadow-lg">
          <span className="text-xl font-black">i</span>
          <span className="text-sm font-black -ml-0.5">X</span>
        </div>
        <h1 className="text-xl font-headline font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          InvoiceXR
        </h1>
      </Link>
    </Button>
  );

  return (
    <>
      {!isAuthPage && (
        <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border/20 bg-sidebar/90 backdrop-blur-md">
          <SidebarHeader className="p-2">
            <Logo />
            {user && user.companyName && (
              <div className="mt-1 px-2 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-2 rounded-md bg-primary/10 p-2 shadow-inner">
                  <Building className="h-4 w-4 flex-shrink-0 text-primary/80" />
                  <p className="truncate text-sm font-semibold text-primary">{user.companyName}</p>
                </div>
              </div>
            )}
          </SidebarHeader>
          <Separator className="bg-sidebar-border/50" />
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
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-sidebar-border/20 bg-sidebar/90 px-4 text-sidebar-foreground backdrop-blur-md sm:h-16 sm:px-6">
              <div className="flex items-center gap-4">
                  <SidebarTrigger variant="ghost" size="icon" className="md:hidden h-10 w-10 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
                  <div className="hidden md:block">
                     <Logo />
                  </div>
              </div>

              <div className="flex-1" />

              {user && (
                  <div className="flex items-center gap-2">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                <Bell className="h-5 w-5" />
                                {pendingRequestCount > 0 && (
                                    <Badge variant="destructive" className="absolute top-1 right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                                    {pendingRequestCount}
                                    </Badge>
                                )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-80" align="end">
                            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {notifications.length > 0 ? (
                                notifications.map((notif) => (
                                <DropdownMenuItem key={notif.id} asChild>
                                    <Link href="/admin" className="cursor-pointer" onClick={handleNavigationClick}>
                                    <div className="flex flex-col">
                                        <p className="text-sm font-medium">
                                        <span className="font-bold">{notif.userName}</span> requested to join.
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })}
                                        </p>
                                    </div>
                                    </Link>
                                </DropdownMenuItem>
                                ))
                            ) : (
                                <div className="p-4 text-sm text-center text-muted-foreground">
                                    You have no new notifications.
                                </div>
                            )}
                          </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                                  <Avatar className="h-10 w-10 border-2 border-primary/50">
                                      <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground font-semibold">
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
                               {user.isSuperAdmin && (
                                 <DropdownMenuItem asChild>
                                    <Link href="/super-admin" className="cursor-pointer">
                                        <Crown className="mr-2 h-4 w-4" />
                                        <span>Super Admin</span>
                                    </Link>
                                </DropdownMenuItem>
                               )}
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
                <Button className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-2xl z-50 bg-gradient-to-br from-pink-400 to-purple-500 hover:scale-110 transition-transform duration-200">
                  <Bot className="h-6 w-6" />
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
