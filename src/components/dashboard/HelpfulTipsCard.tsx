
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, ArrowRight } from 'lucide-react';
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
          <video
            src="https://videos.pexels.com/video-files/853874/853874-hd_1280_720_25fps.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover"
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
