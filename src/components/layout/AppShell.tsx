
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { NAV_ITEMS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building, LogOut, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils'; // Import the cn function

const getInitials = (name?: string | null) => {
  if (!name) return '';
  const names = name.split(' ');
  let initials = names[0] ? names[0][0] : '';
  if (names.length > 1 && names[names.length -1]) {
    initials += names[names.length - 1][0];
  }
  return initials.toUpperCase() || (name ? name[0]?.toUpperCase() : '');
};


const AppShellLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { user, signOut, isLoading: authLoading } = useAuth(); 

  const handleNavigationClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleSignOut = async () => {
    handleNavigationClick(); 
    await signOut();
  };

  const isAuthPage = pathname.startsWith('/auth/');

  return (
    <>
      {!isAuthPage && ( // Conditionally render sidebar if not an auth page (optional, for cleaner auth pages)
        <Sidebar collapsible="icon" variant="sidebar" className="border-r">
          <SidebarHeader className="p-4">
            <Link href="/" onClick={handleNavigationClick}>
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
                <h1 className="text-2xl font-headline font-semibold text-primary group-data-[collapsible=icon]:hidden">ProfitLens</h1>
              </div>
            </Link>
          </SidebarHeader>
          <Separator />
          <SidebarContent className="p-2">
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <Link href={item.href} onClick={handleNavigationClick}>
                    <SidebarMenuButton
                      isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                      tooltip={{ children: item.label, side: 'right', className: 'bg-card text-card-foreground' }}
                      className="justify-start"
                      disabled={authLoading || (!user && item.href !== '/')} 
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 mt-auto border-t flex flex-col gap-2 items-center group-data-[collapsible=icon]:items-start">
            {user && !authLoading ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full flex items-center justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:h-auto">
                    <Avatar className="h-7 w-7 group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6">
                      <AvatarFallback>{getInitials(user.displayName || user.email)}</AvatarFallback>
                    </Avatar>
                    <span className="group-data-[collapsible=icon]:hidden truncate max-w-[100px]">{user.displayName || user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56 mb-2 ml-2 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:mb-0 group-data-[collapsible=icon]:mt-2">
                  <DropdownMenuLabel className="truncate">{user.displayName || 'My Account'}</DropdownMenuLabel>
                  {user.email && <DropdownMenuLabel className="text-xs font-normal text-muted-foreground -mt-2 truncate">{user.email}</DropdownMenuLabel>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild onClick={handleNavigationClick}>
                    <Link href="/company-details">
                      <Building className="mr-2 h-4 w-4" />
                      <span>Company Details</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : !authLoading && !user ? (
              <div className="w-full flex flex-col gap-2 group-data-[collapsible=icon]:items-center">
                 <Button variant="outline" size="sm" className="w-full group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center" asChild onClick={handleNavigationClick}>
                    <Link href="/auth/signin"><LogIn className="mr-2 h-4 w-4" /> Sign In</Link>
                 </Button>
                 <Button size="sm" className="w-full group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center" asChild onClick={handleNavigationClick}>
                    <Link href="/auth/signup"><UserPlus className="mr-2 h-4 w-4" /> Sign Up</Link>
                 </Button>
              </div>
            ) : null }
             <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">© {new Date().getFullYear()} ProfitLens</p>
          </SidebarFooter>
        </Sidebar>
      )}

      <SidebarInset className={cn(isAuthPage && "md:!ml-0")}> {/* Remove margin for auth pages */}
        {!isAuthPage && ( // Conditionally render header if not an auth page
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 md:hidden">
              <SidebarTrigger variant="outline" size="icon" />
              <Link href="/" onClick={handleNavigationClick}>
                <div className="flex items-center gap-2 md:hidden">
                   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="M2 17l10 5 10-5"></path>
                      <path d="M2 12l10 5 10-5"></path>
                   </svg>
                  <span className="font-headline text-lg font-semibold text-primary">ProfitLens</span>
                </div>
              </Link>
          </header>
        )}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {authLoading ? (
             <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading session...</p>
             </div>
           ) : children}
        </main>
      </SidebarInset>
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
