
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const HelpfulTipsCard = () => {
  return (
    <Card className="shadow-lg flex flex-col">
      <CardHeader>
        <CardTitle className="font-headline">Need Help?</CardTitle>
        <CardDescription>Our comprehensive guide has you covered.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <p className="text-sm text-muted-foreground mb-4">
          Unsure how a feature works? Check out our detailed user guide for step-by-step instructions and tips on how to get the most out of ProfitLens.
        </p>
        <div className="aspect-video w-full relative rounded-lg overflow-hidden mb-4">
           <Image
            src="https://placehold.co/600x400.png"
            alt="Employee creating documents on a laptop in an office."
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            data-ai-hint="office laptop"
          />
        </div>
        <Button asChild className="w-full mt-auto">
          <Link href="/guide">
            <HelpCircle className="mr-2 h-4 w-4" />
            View the Full Guide
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default HelpfulTipsCard;
