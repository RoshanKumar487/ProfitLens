/**
 * @fileOverview Types and schemas for the receipt analysis flow.
 */

import {z} from 'genkit';

/**
 * Zod schema for the input of the receipt analysis flow.
 */
export const AnalyzeReceiptInputSchema = z.object({
  receiptImage: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeReceiptInput = z.infer<typeof AnalyzeReceiptInputSchema>;


/**
 * Zod schema for the output of the receipt analysis flow.
 */
export const AnalyzeReceiptOutputSchema = z.object({
  vendor: z.string().optional().describe('The name of the vendor or store.'),
  amount: z.number().optional().describe('The total amount of the transaction as a number, removing any currency symbols or commas.'),
  date: z.string().optional().describe('The date of the transaction in YYYY-MM-DD format. If the full date is not present, provide the best possible guess.'),
  description: z.string().optional().describe('A brief, one-line summary of the items purchased. If multiple items are listed, summarize them (e.g., "Office supplies and snacks").'),
  category: z.string().optional().describe("A suggested expense category based on the items or vendor from this list: 'Software & Subscriptions', 'Marketing & Advertising', 'Office Supplies', 'Utilities', 'Rent & Lease', 'Salary / Advance', 'Travel', 'Meals & Entertainment', 'Professional Services', 'Other'")
});
export type AnalyzeReceiptOutput = z.infer<typeof AnalyzeReceiptOutputSchema>;
