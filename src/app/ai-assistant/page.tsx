
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, Loader2, Send, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PageTitle from '@/components/PageTitle';
import { askAssistantAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const EXAMPLE_PROMPTS = [
  'Show me all employees',
  'Add a new expense for $50 for "Office Supplies"',
  'What was our total revenue last month?',
  'Generate an expense report for this quarter',
  'What are our top 3 expense categories?',
  'Change invoice INV071671 status to Paid',
];

export default function AiAssistantPage() {
  const { user, currencySymbol } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent, prompt?: string) => {
    if (e) e.preventDefault();
    const currentInput = prompt || input;
    if (!currentInput.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
    };
    setMessages((prev) => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const assistantResponse = await askAssistantAction(
        [...messages, newUserMessage],
        currencySymbol
      );
      const newAssistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantResponse,
      };
      setMessages((prev) => [...prev, newAssistantMessage]);
    } catch (error) {
      console.error('Error asking assistant:', error);
      toast({
        title: 'An error occurred',
        description: 'The AI assistant could not process your request. Please try again.',
        variant: 'destructive',
      });
      setMessages((prev) => prev.slice(0, -1)); // Remove the user message that failed
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    handleSubmit(undefined, prompt);
  };

  if (!user) {
    return (
        <div className="flex justify-center items-center h-64 p-4 sm:p-6 lg:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You must be signed in to use the AI Assistant.</CardDescription>
                </CardHeader>
            </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4 sm:p-6 lg:p-8">
      <PageTitle title="AI Assistant" subtitle="Your smart assistant for managing business data." icon={Sparkles} />
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 p-0 flex flex-col">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.length === 0 && (
                    <div className="text-center p-8">
                        <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h2 className="mt-2 text-xl font-semibold">How can I help you today?</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            You can ask me to add, find, or update data, generate reports, and more.
                        </p>
                         <div className="mt-6">
                            <p className="text-sm font-medium mb-2">Try an example:</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {EXAMPLE_PROMPTS.map((prompt) => (
                                    <Button key={prompt} variant="outline" size="sm" onClick={() => handlePromptClick(prompt)}>
                                        {prompt}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex items-start gap-4',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <Avatar className="h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center">
                        <Bot className="h-5 w-5" />
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        'max-w-xl rounded-lg px-4 py-2',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <ReactMarkdown className="prose dark:prose-invert text-sm prose-p:leading-relaxed prose-p:m-0 prose-headings:m-0 prose-headings:font-semibold prose-headings:text-base prose-ol:m-0 prose-ul:m-0 prose-li:m-0 prose-table:my-2 prose-table:w-full prose-thead:border-b prose-th:px-2 prose-th:py-1 prose-th:text-left prose-tbody:divide-y prose-tr:border-0 prose-td:px-2 prose-td:py-1">
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {message.role === 'user' && (
                       <Avatar className="h-8 w-8">
                            <span className="flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground">{user?.displayName?.charAt(0) || 'U'}</span>
                       </Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start gap-4 justify-start">
                    <Avatar className="h-8 w-8 bg-primary text-primary-foreground flex items-center justify-center">
                        <Bot className="h-5 w-5" />
                    </Avatar>
                    <div className="max-w-md rounded-lg px-4 py-3 bg-muted flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="border-t p-4">
              <form onSubmit={handleSubmit} className="relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me to do something... e.g., 'Add a new employee named Jane Doe'"
                  className="pr-16"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute bottom-2.5 right-2.5"
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
