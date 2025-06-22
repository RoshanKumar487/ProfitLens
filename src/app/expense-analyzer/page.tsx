'use client';

import React, { useState } from 'react';
import PageTitle from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, CheckCircle, AlertTriangle, Loader2, Info } from 'lucide-react';
import {
  analyzeExpenseOpportunities,
  type AnalyzeExpenseOpportunitiesOutput,
} from '@/ai/flows/analyze-expense-opportunities';
import {
  analyzeExpenseReport,
} from '@/ai/flows/analyze-expense-report';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AnalysisResult = AnalyzeExpenseOpportunitiesOutput;

export default function ExpenseAnalyzerPage() {
  const { user } = useAuth();
  const currency = user?.currencySymbol || '$';
  
  // State for Manual Input tab
  const [revenue, setRevenue] = useState<string>('');
  const [expenses, setExpenses] = useState<string>('');
  const [additionalContext, setAdditionalContext] = useState<string>('');

  // State for Text Analysis tab
  const [reportText, setReportText] = useState<string>('');

  // Shared state for results
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    const revenueNum = parseFloat(revenue);
    const expensesNum = parseFloat(expenses);

    if (isNaN(revenueNum) || isNaN(expensesNum)) {
      setError('Please enter valid numbers for revenue and expenses.');
      setIsLoading(false);
      toast({
        title: 'Invalid Input',
        description: 'Revenue and expenses must be numbers.',
        variant: 'destructive',
      });
      return;
    }
     if (revenueNum < 0 || expensesNum < 0) {
      setError('Revenue and expenses cannot be negative.');
      setIsLoading(false);
      toast({
        title: 'Invalid Input',
        description: 'Revenue and expenses must be positive numbers or zero.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await analyzeExpenseOpportunities({
        revenue: revenueNum,
        expenses: expensesNum,
        additionalContext: additionalContext || undefined,
      });
      setAnalysisResult(result);
      toast({
        title: 'Analysis Complete',
        description: 'Expense reduction opportunities identified.',
      });
    } catch (err) {
      console.error('Error analyzing expenses:', err);
      setError('Failed to analyze expenses. Please try again.');
      toast({
        title: 'Analysis Failed',
        description: 'An error occurred during the analysis.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) {
      setError('Please paste some text to analyze.');
      toast({ title: 'Input Required', description: 'The text area cannot be empty.', variant: 'destructive'});
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeExpenseReport({ expenseReport: reportText });
      setAnalysisResult(result);
      toast({
        title: 'Analysis Complete',
        description: 'Expense report analyzed successfully.',
      });
    } catch (err) {
      console.error('Error analyzing expense report:', err);
      setError('Failed to analyze the report. Please try again.');
      toast({
        title: 'Analysis Failed',
        description: 'An error occurred during the text analysis.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <PageTitle title="Expense Analyzer" subtitle="AI-powered insights to reduce your business expenses." icon={Sparkles} />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
           <Tabs defaultValue="manual">
            <CardHeader>
                <CardTitle className="font-headline">Data Input</CardTitle>
                <CardDescription>Choose an analysis method.</CardDescription>
                <TabsList className="grid w-full grid-cols-2 mt-2">
                    <TabsTrigger value="manual">Financial Summary</TabsTrigger>
                    <TabsTrigger value="text">Paste Report</TabsTrigger>
                </TabsList>
            </CardHeader>

            <TabsContent value="manual" className="p-0">
                <CardContent>
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="revenue">Total Revenue ({currency})</Label>
                        <Input
                        id="revenue"
                        type="number"
                        value={revenue}
                        onChange={(e) => setRevenue(e.target.value)}
                        placeholder="e.g., 50000"
                        required
                        min="0"
                        />
                    </div>

                    <div>
                        <Label htmlFor="expenses">Total Expenses ({currency})</Label>
                        <Input
                        id="expenses"
                        type="number"
                        value={expenses}
                        onChange={(e) => setExpenses(e.target.value)}
                        placeholder="e.g., 30000 (Itemize in context if possible)"
                        required
                        min="0"
                        />
                    </div>

                    <div>
                        <Label htmlFor="additionalContext">Additional Context (Optional)</Label>
                        <Textarea
                        id="additionalContext"
                        value={additionalContext}
                        onChange={(e) => setAdditionalContext(e.target.value)}
                        placeholder="e.g., Itemized expenses, business goals, recent changes..."
                        rows={4}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Analyze Financials
                    </Button>
                    </form>
                </CardContent>
            </TabsContent>

            <TabsContent value="text" className="p-0">
                <CardContent>
                    <form onSubmit={handleTextSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="reportText">Expense Report Text</Label>
                            <Textarea
                                id="reportText"
                                value={reportText}
                                onChange={(e) => setReportText(e.target.value)}
                                placeholder="Paste your expense data here, e.g., from a spreadsheet or document."
                                rows={11}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Analyze Text
                        </Button>
                    </form>
                </CardContent>
            </TabsContent>

           </Tabs>
        </Card>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive" className="shadow-md">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isLoading && !analysisResult && !error && (
             <Alert className="shadow-md border-primary/50">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary font-headline">Ready to Analyze</AlertTitle>
                <AlertDescription>
                  Enter your financial data in one of the tabs on the left. The more context you provide, the better the AI-powered suggestions will be.
                </AlertDescription>
              </Alert>
          )}

          {isLoading && (
            <Card className="shadow-lg animate-pulse">
              <CardHeader>
                <CardTitle className="font-headline h-6 bg-muted rounded w-3/4"></CardTitle>
                <CardDescription className="h-4 bg-muted rounded w-1/2"></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          )}

          {analysisResult && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><CheckCircle className="h-6 w-6 text-accent" /> Analysis Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">Summary</h3>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">{analysisResult.summary}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">Potential Opportunities</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    {analysisResult.opportunities.map((opp, index) => (
                      <li key={index}>{opp}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-1">Recommendations</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    {analysisResult.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
