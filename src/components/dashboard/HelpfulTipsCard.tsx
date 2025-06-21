
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

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
            src="https://placehold.co/600x338.png" 
            alt="Business illustration" 
            layout="fill"
            objectFit="cover"
            className="rounded-lg"
            data-ai-hint="documentation guide"
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
