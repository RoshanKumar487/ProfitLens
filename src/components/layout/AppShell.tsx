
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
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const AppShellLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { user, isLoading: authLoading } = useAuth(); 

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
      // Show all nav items for logged-in users, or only guide/dashboard for logged-out
      if (!user && !['/', '/guide'].includes(item.href)) {
         return false;
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
               <svg role="img" aria-label="Dappr logo" className="h-7 w-7 text-white" viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M54 108C83.8233 108 108 83.8233 108 54C108 24.1767 83.8233 0 54 0C24.1767 0 0 24.1767 0 54C0 83.8233 24.1767 108 54 108Z" fill="white"/>
                    <path d="M54 108C83.8233 108 108 83.8233 108 54C108 24.1767 83.8233 0 54 0C24.1767 0 0 24.1767 0 54C0 83.8233 24.1767 108 54 108Z" fill="white"/>
                    <path d="M72.5859 54.1289C72.5859 64.082 64.1289 72.5859 54.1289 72.5859C44.1758 72.5859 35.6719 64.082 35.6719 54.1289C35.6719 44.1758 44.1758 35.6719 54.1289 35.6719C64.1289 35.6719 72.5859 44.1758 72.5859 54.1289Z" fill="black"/>
                </svg>
                <h1 className="text-2xl font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">dappr</h1>
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
             <p className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">© {new Date().getFullYear()} ProfitLens</p>
          </SidebarFooter>
        </Sidebar>
      )}

      <SidebarInset className={cn(isAuthPage && "md:!ml-0")}>
        {!isAuthPage && (
           <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 md:hidden">
              <SidebarTrigger variant="outline" size="icon" />
              <Link href="/" onClick={handleNavigationClick} className="flex items-center gap-2 md:hidden">
                  <svg role="img" aria-label="Dappr logo" className="h-6 w-6 text-black" viewBox="0 0 108 108" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M54 108C83.8233 108 108 83.8233 108 54C108 24.1767 83.8233 0 54 0C24.1767 0 0 24.1767 0 54C0 83.8233 24.1767 108 54 108Z" fill="black"/>
                        <path d="M54 108C83.8233 108 108 83.8233 108 54C108 24.1767 83.8233 0 54 0C24.1767 0 0 24.1767 0 54C0 83.8233 24.1767 108 54 108Z" fill="black"/>
                        <path d="M72.5859 54.1289C72.5859 64.082 64.1289 72.5859 54.1289 72.5859C44.1758 72.5859 35.6719 64.082 35.6719 54.1289C35.6719 44.1758 44.1758 35.6719 54.1289 35.6719C64.1289 35.6719 72.5859 44.1758 72.5859 54.1289Z" fill="white"/>
                  </svg>
                  <span className="font-bold text-lg text-foreground">dappr</span>
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
    <SidebarProvider defaultOpen={false}>
      <AppShellLayout>{children}</AppShellLayout>
    </SidebarProvider>
  );
};

export default AppShell;
