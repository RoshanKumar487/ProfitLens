
import type { LucideIcon } from 'lucide-react';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DataCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

const DataCard: React.FC<DataCardProps> = ({ title, value, icon: Icon, description, trend, trendValue, className }) => {
  const trendColor = trend === 'up' ? 'text-accent' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card className={cn(
      "data-card relative overflow-hidden",
      "transition-all duration-300 ease-out",
      "hover:scale-[1.03] hover:shadow-xl",
      "shadow-lg",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground/80">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground pt-1">{description}</p>
        )}
        {trend && trendValue && (
          <p className={cn("text-xs pt-1", trendColor)}>
            {trendValue}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DataCard;
