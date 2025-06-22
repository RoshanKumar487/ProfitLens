
'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
}

interface RevenueVsExpensesChartProps {
  data: MonthlyData[];
  currencySymbol: string;
}

export default function RevenueVsExpensesChart({ data, currencySymbol }: RevenueVsExpensesChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${currencySymbol}${value / 1000}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          cursor={{ fill: 'hsl(var(--muted))' }}
        />
        <Legend iconType="circle" iconSize={10} />
        <Bar dataKey="revenue" fill="hsl(var(--chart-2))" name="Revenue" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expenses" fill="hsl(var(--chart-1))" name="Expenses" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
