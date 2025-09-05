
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import { LogOut, Loader2, Building, HelpCircle, User, Crown, ChevronDown, PlusCircle, Receipt, TrendingDown, Users, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AssistantChat } from '@/components/AssistantChat';
import { useAuth } from '@/contexts/AuthContext';
import { signOutAction } from '@/app/auth/actions';

const AppShellLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutAction();
  };
  
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
  
  const visibleNavItems = useMemo(() => {
    if (!user) return [];
    return NAV_ITEMS.filter(item => {
      if (item.sidebar === false) return false;
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
          className="h-7 w-7 text-primary"
        >
          <path
            d="M22 2L15 22L11 13L2 9L22 2Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h1 className="text-xl font-headline font-bold text-foreground/80 group-data-[collapsible=icon]:hidden">
          InvoPilot
        </h1>
      </Link>
    </Button>
  );

  return (
    <>
      <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border bg-sidebar backdrop-blur-lg print:hidden">
        <SidebarHeader className="p-2">
          <Logo />
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
                >
                  <Link href={item.href} onClick={handleNavigationClick}>
                    <item.icon />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 border-b border-header-border bg-header backdrop-blur-lg print:hidden">
            <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
              <SidebarTrigger className="md:hidden" />
              
              <div className="hidden items-center gap-2 md:flex">
                  <Building className="h-5 w-5 flex-shrink-0 text-primary" />
                  <p className="truncate text-lg font-semibold">{user?.companyName || 'Loading...'}</p>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-2">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="default" size="sm">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              <span className="hidden sm:inline">Create New</span>
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
                              <Link href="/employees/new/edit" onClick={handleNavigationClick}>
                                  <Users className="mr-2 h-4 w-4" />
                                  <span>New Employee</span>
                              </Link>
                          </DropdownMenuItem>
                      </DropdownMenuContent>
                  </DropdownMenu>
                   <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-accent hover:text-accent-foreground" onClick={() => setIsAssistantOpen(true)}>
                                <Sparkles className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>AI Assistant</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                     <DropdownMenu>
                         <DropdownMenuTrigger asChild disabled={isLoading}>
                             <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                        {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : getInitials(user?.displayName)}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent className="w-56" side="bottom" align="end">
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                              {user?.isSuperAdmin && (
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
                               <Link href="/settings" className="cursor-pointer">
                                 <Settings className="mr-2 h-4 w-4" />
                                 <span>Settings</span>
                               </Link>
                             </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                               <Link href="/guide" className="cursor-pointer">
                                 <HelpCircle className="mr-2 h-4 w-4" />
                                 <span>User Guide</span>
                               </Link>
                             </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Sign Out</span>
                            </DropdownMenuItem>
                         </DropdownMenuContent>
                     </DropdownMenu>

              </div>
            </div>
        </header>
        <main className="flex-1 print:p-0">
          {children}
        </main>
      </SidebarInset>
      
      <Dialog open={isAssistantOpen} onOpenChange={setIsAssistantOpen}>
          <DialogContent className="sm:max-w-2xl h-[calc(100vh-8rem)] flex flex-col p-0 gap-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary"/>
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
    </>
  );
};

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not authenticated and not on an auth page, redirect.
  // This can happen briefly on initial load.
  if (!user && !pathname.startsWith('/auth')) {
    // router.replace('/auth/sign-in') is problematic here due to render loops.
    // A simple loading state or null return is safer during hydration.
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (pathname.startsWith('/auth')) {
    return <>{children}</>;
  }
  
  return (
    <SidebarProvider defaultOpen={true}>
      <AppShellLayout>{children}</AppShellLayout>
    </SidebarProvider>
  );
};

export default AppShell;
