
'use client';

import React, { useMemo } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Building, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const AppShellLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { user, signOut, isLoading: authLoading } = useAuth(); 
  const getInitials = (name?: string | null) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

  const handleNavigationClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const isAuthPage = pathname.startsWith('/auth/');
  
  const visibleNavItems = useMemo(() => {
    return NAV_ITEMS.filter(item => {
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
          <SidebarHeader className="p-4">
            <Link href="/" onClick={handleNavigationClick} className="flex items-center gap-2.5">
               <Image src="/logo.svg" alt="ProfitLens Logo" width={32} height={32} />
              <h1 className="text-2xl font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">ProfitLens</h1>
            </Link>
          </SidebarHeader>
          <Separator className="bg-sidebar-border" />
          <SidebarContent className="p-2">
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <Link href={item.href} onClick={handleNavigationClick}>
                    <SidebarMenuButton
                      isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                      tooltip={{ children: item.label, side: 'right', className: 'bg-card text-card-foreground' }}
                      className="justify-start"
                      disabled={authLoading} 
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4 mt-auto border-t border-sidebar-border flex flex-col gap-2 items-center group-data-[collapsible=icon]:items-start">
             {user && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center w-full gap-2 p-2 rounded-md hover:bg-sidebar-accent transition-colors">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user.email === 'roshankumar70975@gmail.com' ? '/roshan.jpeg' : `https://placehold.co/40x40.png`} data-ai-hint="person portrait" />
                                <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                            </Avatar>
                            <div className="text-left group-data-[collapsible=icon]:hidden">
                                <p className="text-sm font-medium text-sidebar-foreground">{user.displayName}</p>
                                <p className="text-xs text-sidebar-foreground/70">{user.email}</p>
                            </div>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 mb-2 ml-2" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.displayName}</p>
                            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/company-details"><Building className="mr-2 h-4 w-4" />Company Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                          <LogOut className="mr-2 h-4 w-4" /> Sign Out
                        </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
          </SidebarFooter>
        </Sidebar>
      )}

      <SidebarInset className={cn(isAuthPage && "md:!ml-0")}>
        {!isAuthPage && (
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 md:hidden">
              <SidebarTrigger variant="outline" size="icon" />
              <Link href="/" onClick={handleNavigationClick} className="flex items-center gap-2 md:hidden">
                  <Image src="/logo.svg" alt="ProfitLens Logo" width={24} height={24} />
                  <span className="font-bold text-lg text-foreground">ProfitLens</span>
              </Link>
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
