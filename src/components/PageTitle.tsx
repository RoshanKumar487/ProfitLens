
import type { LucideIcon } from 'lucide-react';
import React from 'react';

interface PageTitleProps {
  title: string;
  icon?: LucideIcon;
  subtitle?: string;
  children?: React.ReactNode; // For additional elements like buttons
}

const PageTitle: React.FC<PageTitleProps> = ({ title, icon: Icon, subtitle, children }) => {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />}
          <h1 className="text-2xl sm:text-3xl font-headline font-semibold text-foreground">{title}</h1>
        </div>
        {children && <div className="mt-2 sm:mt-0 flex-shrink-0">{children}</div>}
      </div>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
};

export default PageTitle;
