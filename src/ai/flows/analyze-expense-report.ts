
'use server';

/**
 * @fileOverview Expense report analysis AI agent.
 * This file defines a Genkit flow that analyzes unstructured text from an expense report.
 *
 * @exports analyzeExpenseReport - The primary function to call this flow.
 */

import {ai} from '@/ai/genkit';
import {
  AnalyzeExpenseReportInputSchema,
  AnalyzeExpenseReportOutputSchema,
  type AnalyzeExpenseReportInput,
  type AnalyzeExpenseReportOutput
} from './analyze-expense-report-types';


/**
 * Analyzes a text-based expense report to identify potential cost savings.
 * This is the main entry point for the flow.
 *
 * @param {AnalyzeExpenseReportInput} input - The expense report text to analyze.
 * @returns {Promise<AnalyzeExpenseReportOutput>} A promise that resolves to the analysis results.
 */
export async function analyzeExpenseReport(
  input: AnalyzeExpenseReportInput
): Promise<AnalyzeExpenseReportOutput> {
  return analyzeExpenseReportFlow(input);
}


/**
 * Defines the prompt for the Genkit AI model.
 * It instructs the AI to act as a financial analyst and parse the provided text for cost-saving insights.
 */
const prompt = ai.definePrompt({
  name: 'analyzeExpenseReportPrompt',
  input: {schema: AnalyzeExpenseReportInputSchema},
  output: {schema: AnalyzeExpenseReportOutputSchema},
  prompt: `You are a financial analyst specializing in identifying expense reduction opportunities for businesses. 
  
  Analyze the provided expense report text and suggest potential areas for cost savings.  
  
  Expense Report: 
  """
  {{expenseReport}}
  """
  
  Provide a summary of your analysis, a list of potential expense reduction opportunities, and specific recommendations.  
  
  Format the opportunities and recommendations as bullet points.`,
});


/**
 * Defines the main Genkit flow for analyzing an expense report from text.
 * This flow takes the input, calls the AI with the defined prompt, and returns the structured output.
 */
const analyzeExpenseReportFlow = ai.defineFlow(
  {
    name: 'analyzeExpenseReportFlow',
    inputSchema: AnalyzeExpenseReportInputSchema,
    outputSchema: AnalyzeExpenseReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    
    // Ensure output is not null, providing a fallback if needed.
    return output ?? { summary: "Analysis could not be completed.", opportunities: [], recommendations: [] };
  }
);
