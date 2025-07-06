
import type { LucideIcon } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';

interface PageTitleProps {
  title: string;
  icon?: LucideIcon;
  subtitle?: string;
  children?: React.ReactNode; // For additional elements like buttons
  className?: string;
}

const PageTitle: React.FC<PageTitleProps> = ({ title, icon: Icon, subtitle, children, className }) => {
  return (
    <div className={cn("mb-6 sm:mb-8", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="bg-primary p-3 rounded-lg">
              <Icon className="h-6 w-6 text-primary-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-headline font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {children && <div className="mt-2 sm:mt-0 flex-shrink-0">{children}</div>}
      </div>
    </div>
  );
};

export default PageTitle;
