
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import Image from 'next/image';

const HelpfulTipsCard = () => {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Helpful Tips</CardTitle>
        <CardDescription>Boost your business efficiency.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-primary mt-1" />
          <p className="text-sm">Regularly review your Expense Analyzer suggestions to optimize spending.</p>
        </div>
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-primary mt-1" />
          <p className="text-sm">Use invoice templates for faster billing and professional look.</p>
        </div>
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-primary mt-1" />
          <p className="text-sm">Schedule recurring appointments in the calendar to save time.</p>
        </div>
        <Image 
          src="https://placehold.co/600x200.png" 
          alt="Business illustration" 
          width={600} 
          height={200} 
          className="rounded-lg mt-4 object-cover w-full" 
          data-ai-hint="business growth" 
        />
      </CardContent>
    </Card>
  );
};

export default HelpfulTipsCard;
