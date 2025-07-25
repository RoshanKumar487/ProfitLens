
// This is an autogenerated file from Firebase Studio.

'use server';

/**
 * @fileOverview Expense analysis AI agent.
 * 
 * - analyzeExpenseOpportunities - A function that handles the expense analysis process.
 * - AnalyzeExpenseOpportunitiesInput - The input type for the analyzeExpenseOpportunities function.
 * - AnalyzeExpenseOpportunitiesOutput - The return type for the analyzeExpenseOpportunities function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeExpenseOpportunitiesInputSchema = z.object({
  revenue: z.number().describe('Total revenue for the period.'),
  expenses: z.number().describe('Total expenses for the period, itemized if possible.'),
  additionalContext: z
    .string()
    .optional()
    .describe('Any additional context or notes about the financial data.'),
});
export type AnalyzeExpenseOpportunitiesInput = z.infer<typeof AnalyzeExpenseOpportunitiesInputSchema>;

const AnalyzeExpenseOpportunitiesOutputSchema = z.object({
  summary: z.string().describe('A summary of the expense analysis.'),
  opportunities: z
    .array(z.string())
    .describe('A list of potential expense reduction opportunities.'),
  recommendations: z
    .array(z.string())
    .describe('Specific recommendations for reducing expenses.'),
});
export type AnalyzeExpenseOpportunitiesOutput = z.infer<typeof AnalyzeExpenseOpportunitiesOutputSchema>;

export async function analyzeExpenseOpportunities(
  input: AnalyzeExpenseOpportunitiesInput
): Promise<AnalyzeExpenseOpportunitiesOutput> {
  return analyzeExpenseOpportunitiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeExpenseOpportunitiesPrompt',
  input: {schema: AnalyzeExpenseOpportunitiesInputSchema},
  output: {schema: AnalyzeExpenseOpportunitiesOutputSchema},
  prompt: `You are a financial analyst specializing in identifying expense reduction opportunities for businesses.

  Analyze the provided financial data and suggest potential areas for cost savings.

  Revenue: {{revenue}}
  Expenses: {{expenses}}
  Additional Context: {{additionalContext}}

  Provide a summary of your analysis, a list of potential expense reduction opportunities, and specific recommendations.

  Format the opportunities and recommendations as bullet points.
  `,
});

const analyzeExpenseOpportunitiesFlow = ai.defineFlow(
  {
    name: 'analyzeExpenseOpportunitiesFlow',
    inputSchema: AnalyzeExpenseOpportunitiesInputSchema,
    outputSchema: AnalyzeExpenseOpportunitiesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
