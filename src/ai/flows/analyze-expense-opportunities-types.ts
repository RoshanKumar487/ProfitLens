/**
 * @fileOverview Types and schemas for the expense opportunities analysis flow.
 */

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
