/**
 * @fileOverview Types and schemas for the expense report analysis flow.
 */

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
