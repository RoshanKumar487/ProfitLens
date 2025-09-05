
'use server';

/**
 * @fileOverview Expense analysis AI agent.
 * This file defines a Genkit flow for analyzing financial data to find expense reduction opportunities.
 *
 * @exports analyzeExpenseOpportunities - The primary function to call this flow.
 * @exports AnalyzeExpenseOpportunitiesInput - The Zod schema for the input data.
 * @exports AnalyzeExpenseOpportunitiesOutput - The Zod schema for the output data.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Zod schema for the input of the expense opportunities analysis flow.
 */
export const AnalyzeExpenseOpportunitiesInputSchema = z.object({
  revenue: z.number().describe('Total revenue for the financial period.'),
  expenses: z.number().describe('Total expenses for the financial period.'),
  additionalContext: z
    .string()
    .optional()
    .describe('Any additional context or itemized details about the financial data.'),
});
export type AnalyzeExpenseOpportunitiesInput = z.infer<typeof AnalyzeExpenseOpportunitiesInputSchema>;


/**
 * Zod schema for the output of the expense opportunities analysis flow.
 */
export const AnalyzeExpenseOpportunitiesOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the financial analysis.'),
  opportunities: z
    .array(z.string())
    .describe('A list of potential areas for expense reduction.'),
  recommendations: z
    .array(z.string())
    .describe('Specific, actionable recommendations for reducing expenses.'),
});
export type AnalyzeExpenseOpportunitiesOutput = z.infer<typeof AnalyzeExpenseOpportunitiesOutputSchema>;


/**
 * Analyzes financial data to identify potential expense reduction opportunities.
 * This is the main entry point for the flow.
 *
 * @param {AnalyzeExpenseOpportunitiesInput} input - The financial data to analyze.
 * @returns {Promise<AnalyzeExpenseOpportunitiesOutput>} A promise that resolves to the analysis results.
 */
export async function analyzeExpenseOpportunities(
  input: AnalyzeExpenseOpportunitiesInput
): Promise<AnalyzeExpenseOpportunitiesOutput> {
  return analyzeExpenseOpportunitiesFlow(input);
}


/**
 * Defines the prompt for the Genkit AI model.
 * It instructs the AI to act as a financial analyst and provide cost-saving suggestions.
 */
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


/**
 * Defines the main Genkit flow for analyzing expense opportunities.
 * This flow takes the input, calls the AI with the defined prompt, and returns the structured output.
 */
const analyzeExpenseOpportunitiesFlow = ai.defineFlow(
  {
    name: 'analyzeExpenseOpportunitiesFlow',
    inputSchema: AnalyzeExpenseOpportunitiesInputSchema,
    outputSchema: AnalyzeExpenseOpportunitiesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    
    // Ensure output is not null, providing a fallback if needed.
    return output ?? { summary: "Analysis could not be completed.", opportunities: [], recommendations: [] };
  }
);
