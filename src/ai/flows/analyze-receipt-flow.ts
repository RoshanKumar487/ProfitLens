
'use server';
/**
 * @fileOverview An AI agent for analyzing and extracting data from receipt images.
 * This file defines a Genkit flow that takes an image of a receipt and returns structured data.
 *
 * @exports analyzeReceipt - The primary function to call this flow.
 */

import {ai} from '@/ai/genkit';
import {
  AnalyzeReceiptInputSchema,
  AnalyzeReceiptOutputSchema,
  type AnalyzeReceiptInput,
  type AnalyzeReceiptOutput
} from './analyze-receipt-types';


/**
 * Analyzes an image of a receipt to extract structured transaction data.
 * This is the main entry point for the flow.
 *
 * @param {AnalyzeReceiptInput} input - The input data containing the receipt image.
 * @returns {Promise<AnalyzeReceiptOutput>} A promise that resolves to the extracted receipt data.
 */
export async function analyzeReceipt(input: AnalyzeReceiptInput): Promise<AnalyzeReceiptOutput> {
  return analyzeReceiptFlow(input);
}


/**
 * Defines the prompt for the Genkit AI model.
 * It takes the receipt image and instructs the AI to extract transaction details
 * according to the provided output schema.
 */
const prompt = ai.definePrompt({
  name: 'analyzeReceiptPrompt',
  input: {schema: AnalyzeReceiptInputSchema},
  output: {schema: AnalyzeReceiptOutputSchema},
  prompt: `You are an expert accountant specializing in parsing receipt data. Analyze the provided receipt image.
  
  Extract the following information:
  1.  **Vendor**: The name of the store or service provider.
  2.  **Amount**: The final total amount of the transaction. This should be a number.
  3.  **Date**: The date the transaction occurred. Format it as YYYY-MM-DD. If the year is not present, assume the current year. If the date is ambiguous, make a reasonable guess.
  4.  **Description**: A brief, one-line summary of what was purchased. If items are listed, summarize them.
  5.  **Category**: Suggest a relevant expense category from this list: 'Software & Subscriptions', 'Marketing & Advertising', 'Office Supplies', 'Utilities', 'Rent & Lease', 'Salary / Advance', 'Travel', 'Meals & Entertainment', 'Professional Services', 'Other'.

  Receipt Image: {{media url=receiptImage}}
  `,
});


/**
 * Defines the main Genkit flow for analyzing a receipt.
 * This flow takes the input, calls the AI with the defined prompt, and returns the structured output.
 */
const analyzeReceiptFlow = ai.defineFlow(
  {
    name: 'analyzeReceiptFlow',
    inputSchema: AnalyzeReceiptInputSchema,
    outputSchema: AnalyzeReceiptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    
    // Ensure output is not null, providing a fallback if needed.
    return output ?? {};
  }
);
