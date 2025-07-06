
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
  SidebarFooter,
} from '@/components/ui/sidebar';
import { NAV_ITEMS } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, Loader2, Building, LayoutTemplate, Bell, Bot, HelpCircle, User, Crown, ChevronLeft, ChevronRight, PlusCircle, ChevronDown, Receipt, TrendingDown, Users, Sparkles } from 'lucide-react';
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
  const { isMobile, setOpenMobile, toggleSidebar, state } = useSidebar();
  const { user, signOut, isLoading: authLoading } = useAuth(); 
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);
  const [pendingRequestCount, setPendingRequestCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const CollapseIcon = state === 'expanded' ? ChevronLeft : ChevronRight;
  
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
      if (item.href === '/admin' || item.href === '/payroll') {
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
      className="h-12 w-full justify-start gap-3 px-4 text-lg font-bold hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:px-0"
      asChild
    >
      <Link href="/">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7"
        >
          <defs>
            <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>
          </defs>
          <path
            d="M22 2L15 22L11 13L2 9L22 2Z"
            fill="url(#logoGradient)"
            stroke="url(#logoGradient)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h1 className="text-xl font-headline font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          InvoPilot
        </h1>
      </Link>
    </Button>
  );

  return (
    <>
      {!isAuthPage && (
        <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border/20 bg-sidebar backdrop-blur-md print:hidden">
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
            <SidebarFooter className="mt-auto hidden p-2 md:block">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-10 w-full justify-start group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                      onClick={toggleSidebar}
                    >
                      <CollapseIcon className="size-5 shrink-0" />
                      <span className="group-data-[collapsible=icon]:hidden">
                        {state === 'expanded' ? 'Collapse' : 'Expand'}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" hidden={state === "expanded"}>
                    Expand sidebar
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
          </SidebarFooter>
        </Sidebar>
      )}

      <SidebarInset className={cn(isAuthPage && "md:!ml-0")}>
        {!isAuthPage && (
           <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm print:hidden">
              <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
                <SidebarTrigger className="md:hidden" />
                
                {user && user.companyName && (
                  <div className="hidden items-center gap-2 md:flex">
                      <Building className="h-5 w-5 flex-shrink-0 text-primary" />
                      <p className="truncate text-lg font-semibold">{user.companyName}</p>
                  </div>
                )}

                <div className="flex-1" />

                {user && (
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="default" size="icon">
                                    <PlusCircle className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem asChild>
                                    <Link href="/invoicing/new" onClick={handleNavigationClick}>
                                        <Receipt className="mr-2 h-4 w-4" />
                                        <span>New Invoice</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/record-expenses/new" onClick={handleNavigationClick}>
                                        <TrendingDown className="mr-2 h-4 w-4" />
                                        <span>New Expense</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/employees/new" onClick={handleNavigationClick}>
                                        <Users className="mr-2 h-4 w-4" />
                                        <span>New Employee</span>
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-accent hover:text-accent-foreground">
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
                              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-accent hover:text-accent-foreground">
                                    <Avatar className="h-10 w-10 border-2 border-primary/50">
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
            </div>
          </header>
        )}
        <main className="flex-1 print:p-0">
          {authLoading ? (
             <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
             </div>
           ) : children}
        </main>
      </SidebarInset>
      
      {!isAuthPage && !authLoading && user && (
        <Dialog open={isAssistantOpen} onOpenChange={setIsAssistantOpen}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 bg-[#7C3AED] hover:bg-[#6D28D9] text-white hover:scale-110 transition-transform duration-200 print:hidden">
                    <Sparkles className="h-7 w-7" />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>AI Assistant</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
