
'use client';

import React from 'react';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NAV_ITEMS } from '@/lib/constants';
import Link from 'next/link';
import { LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const ToolCard = ({ item, isEnabled }: { item: (typeof NAV_ITEMS)[0]; isEnabled: boolean }) => {
  const CardContentWrapper = isEnabled ? Link : 'div';
  return (
    <Card
      className={cn(
        'group relative flex h-full transform flex-col justify-between overflow-hidden transition-all duration-300 ease-out hover:shadow-2xl',
        isEnabled ? 'hover:-translate-y-2 hover:shadow-primary/20' : 'bg-muted/50 text-muted-foreground'
      )}
    >
      <CardContentWrapper
        href={isEnabled ? item.href : '#'}
        className={cn(!isEnabled && 'cursor-not-allowed')}
      >
        <CardHeader>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <item.icon className="h-6 w-6" />
          </div>
          <CardTitle className="font-headline text-xl">{item.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </CardContent>
      </CardContentWrapper>
      {!isEnabled && (
        <div className="absolute inset-0 bg-background/60" />
      )}
    </Card>
  );
};

export default function MyToolsPage() {
  const { user } = useAuth();

  // Filter out the 'My Tools' item itself from the list of cards to display.
  const accessibleTools = NAV_ITEMS.filter(item => item.href !== '/');

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle
        title="My Tools"
        subtitle="Your central hub for managing all aspects of your business."
        icon={LayoutGrid}
      />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {accessibleTools.map(item => (
          <ToolCard key={item.href} item={item} isEnabled={true} />
        ))}
      </div>
    </div>
  );
}
