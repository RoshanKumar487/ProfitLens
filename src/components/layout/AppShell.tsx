
'use client';

import React, { useMemo } from 'react';
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
  SidebarFooter,
} from '@/components/ui/sidebar';
import { NAV_ITEMS } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, Loader2, Building, LayoutTemplate, Bell, Bot, HelpCircle, User, Crown, ChevronLeft, ChevronRight, PlusCircle, ChevronDown, Receipt, TrendingDown, Users, Sparkles, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AssistantChat } from '@/components/AssistantChat';
import { Badge } from '@/components/ui/badge';
import { signOut as signOutAction } from '@/app/auth/actions';

const AppShellLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile, toggleSidebar, state } = useSidebar();
  const { user, isLoading: authLoading } = useAuth(); 
  const [isAssistantOpen, setIsAssistantOpen] = React.useState(false);
  const [pendingRequestCount, setPendingRequestCount] = React.useState(0);
  const CollapseIcon = state === 'expanded' ? ChevronLeft : ChevronRight;
  
  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.trim().split(/\s+/);
    if (names.length === 0 || names[0] === '') return 'U';
    
    const firstInitial = names[0][0];
    const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
    
    return (firstInitial + lastInitial).toUpperCase();
  };
  
  const handleSignOut = async () => {
    await signOutAction();
    router.refresh();
  };


  const handleNavigationClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter(item => {
      if (item.sidebar === false) return false;
      if (!user) return false;
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
          BizSight
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
                     {item.href === '/admin' && pendingRequestCount > 0 && (
                      <Badge className="ml-auto group-data-[collapsible=icon]:hidden">{pendingRequestCount}</Badge>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="mt-auto p-2">
             {authLoading ? (
                 <div className="flex w-full items-center justify-start gap-2 p-2 group-data-[collapsible=icon]:justify-center">
                     <Loader2 className="h-5 w-5 animate-spin" />
                     <span className="text-sm group-data-[collapsible=icon]:hidden">Loading...</span>
                 </div>
             ) : user ? (
                 <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="h-auto w-full justify-start p-2 text-left group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                            <Avatar className="h-8 w-8 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9">
                                <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                                    {getInitials(user.displayName)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="ml-2 flex-grow truncate group-data-[collapsible=icon]:hidden">
                                <p className="truncate text-sm font-semibold">{user.displayName}</p>
                                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            </div>
                            <ChevronDown className="ml-1 h-4 w-4 shrink-0 group-data-[collapsible=icon]:hidden" />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
                           <Link href="/settings" className="cursor-pointer">
                             <Settings className="mr-2 h-4 w-4" />
                             <span>Settings</span>
                           </Link>
                         </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={handleSignOut} className="cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sign Out</span>
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                 </DropdownMenu>
             ) : (
                <SidebarMenuButton className="justify-start group-data-[collapsible=icon]:justify-center" asChild>
                    <Link href="/auth/signin"><LogOut className="mr-2 h-4 w-4" /> <span className="group-data-[collapsible=icon]:hidden">Sign In</span></Link>
                </SidebarMenuButton>
             )}
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

      <SidebarInset>
        <header className="sticky top-0 z-30 border-b border-header-border bg-header backdrop-blur-lg print:hidden">
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
                                 {pendingRequestCount > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{pendingRequestCount}</Badge>}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-80" align="end">
                            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                              <div className="p-4 text-sm text-center text-muted-foreground">
                                    You have no new notifications.
                              </div>
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </div>
              )}
            </div>
        </header>
        <main className="flex-1 print:p-0">
          {children}
        </main>
      </SidebarInset>
      
      {user && (
        <Dialog open={isAssistantOpen} onOpenChange={setIsAssistantOpen}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-110 transition-transform duration-200 print:hidden">
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
    <SidebarProvider defaultOpen={true}>
      <AppShellLayout>{children}</AppShellLayout>
    </SidebarProvider>
  );
};

export default AppShell;
