'use server';
/**
 * @fileOverview An AI agent for analyzing receipts.
 *
 * - analyzeReceipt - A function that handles the receipt analysis process.
 * - AnalyzeReceiptInput - The input type for the analyzeReceipt function.
 * - AnalyzeReceiptOutput - The return type for the analyzeReceipt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeReceiptInputSchema = z.object({
  receiptImage: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeReceiptInput = z.infer<typeof AnalyzeReceiptInputSchema>;

const AnalyzeReceiptOutputSchema = z.object({
  vendor: z.string().optional().describe('The name of the vendor or store.'),
  amount: z.number().optional().describe('The total amount of the transaction.'),
  date: z.string().optional().describe('The date of the transaction in YYYY-MM-DD format.'),
  description: z.string().optional().describe('A brief summary of the items purchased.'),
  category: z.string().optional().describe("A suggested expense category based on the items or vendor from this list: 'Software & Subscriptions', 'Marketing & Advertising', 'Office Supplies', 'Utilities', 'Rent & Lease', 'Salaries & Wages', 'Travel', 'Meals & Entertainment', 'Professional Services', 'Other'")
});
export type AnalyzeReceiptOutput = z.infer<typeof AnalyzeReceiptOutputSchema>;

export async function analyzeReceipt(input: AnalyzeReceiptInput): Promise<AnalyzeReceiptOutput> {
  return analyzeReceiptFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeReceiptPrompt',
  input: {schema: AnalyzeReceiptInputSchema},
  output: {schema: AnalyzeReceiptOutputSchema},
  prompt: `You are an expert accountant specializing in parsing receipt data. Analyze the provided receipt image.
  
  Extract the following information:
  1.  **Vendor**: The name of the store or service provider.
  2.  **Amount**: The final total amount of the transaction. This should be a number.
  3.  **Date**: The date the transaction occurred. Format it as YYYY-MM-DD. If the year is not present, assume the current year.
  4.  **Description**: A brief, one-line summary of what was purchased. If items are listed, summarize them.
  5.  **Category**: Suggest a relevant expense category from this list: 'Software & Subscriptions', 'Marketing & Advertising', 'Office Supplies', 'Utilities', 'Rent & Lease', 'Salaries & Wages', 'Travel', 'Meals & Entertainment', 'Professional Services', 'Other'.

  Receipt Image: {{media url=receiptImage}}
  `,
});

const analyzeReceiptFlow = ai.defineFlow(
  {
    name: 'analyzeReceiptFlow',
    inputSchema: AnalyzeReceiptInputSchema,
    outputSchema: AnalyzeReceiptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
