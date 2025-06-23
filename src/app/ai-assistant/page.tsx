'use client';

import { AssistantChat } from '@/components/AssistantChat';
import PageTitle from '@/components/PageTitle';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import React from 'react';

export default function AiAssistantPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4 sm:p-6 lg:p-8">
      <PageTitle title="AI Assistant" subtitle="Your smart assistant for managing business data." icon={Sparkles} />
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 p-0 flex flex-col">
            <AssistantChat />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
