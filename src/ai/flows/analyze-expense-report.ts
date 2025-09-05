
'use server';

/**
 * @fileOverview Expense report analysis AI agent.
 * This file defines a Genkit flow that analyzes unstructured text from an expense report.
 *
 * @exports analyzeExpenseReport - The primary function to call this flow.
 * @exports AnalyzeExpenseReportInput - The Zod schema for the input data.
 * @exports AnalyzeExpenseReportOutput - The Zod schema for the output data.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';


/**
 * Zod schema for the input of the expense report analysis flow.
 */
export const AnalyzeExpenseReportInputSchema = z.object({
  expenseReport: z.string().describe('The expense report data as a block of text.'),
});
export type AnalyzeExpenseReportInput = z.infer<typeof AnalyzeExpenseReportInputSchema>;


/**
 * Zod schema for the output of the expense report analysis flow.
 */
export const AnalyzeExpenseReportOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the expense report analysis.'),
  opportunities: z
    .array(z.string())
    .describe('A list of potential areas for expense reduction identified from the report.'),
  recommendations: z
    .array(z.string())
    .describe('Specific, actionable recommendations for reducing expenses.'),
});
export type AnalyzeExpenseReportOutput = z.infer<typeof AnalyzeExpenseReportOutputSchema>;


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
