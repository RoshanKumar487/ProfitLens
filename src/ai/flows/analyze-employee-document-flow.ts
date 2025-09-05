
'use server';
/**
 * @fileOverview An AI agent for analyzing documents containing employee lists.
 *
 * This file defines the server-side logic for an AI-powered flow that extracts structured
 * employee data from a document image.
 *
 * @exports analyzeEmployeeDocument - The primary function to call this flow.
 * @exports AnalyzeEmployeeDocumentInput - The Zod schema for the input data.
 * @exports AnalyzeEmployeeDocumentOutput - The Zod schema for the output data.
 * @exports EmployeeSchema - The Zod schema for a single employee object.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Zod schema for the input of the employee document analysis flow.
 */
export const AnalyzeEmployeeDocumentInputSchema = z.object({
  documentImage: z
    .string()
    .describe(
      "A photo of a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeEmployeeDocumentInput = z.infer<typeof AnalyzeEmployeeDocumentInputSchema>;

/**
 * Zod schema defining the structure of a single employee's data.
 */
export const EmployeeSchema = z.object({
    name: z.string().describe("The full name of the employee."),
    position: z.string().describe("The job title or position of the employee."),
    salary: z.number().describe("The salary of the employee, as a number, with any currency symbols or commas removed."),
    description: z.string().optional().describe("Any additional notes or description for the employee."),
});
export type Employee = z.infer<typeof EmployeeSchema>;


/**
 * Zod schema for the output of the employee document analysis flow.
 */
export const AnalyzeEmployeeDocumentOutputSchema = z.object({
    employees: z.array(EmployeeSchema).describe("An array of employees extracted from the document.")
});
export type AnalyzeEmployeeDocumentOutput = z.infer<typeof AnalyzeEmployeeDocumentOutputSchema>;


/**
 * Analyzes an image of a document to extract a list of employees and their details.
 * This is the main entry point for the flow.
 *
 * @param {AnalyzeEmployeeDocumentInput} input - The input data containing the document image.
 * @returns {Promise<AnalyzeEmployeeDocumentOutput>} A promise that resolves to the structured employee data.
 */
export async function analyzeEmployeeDocument(input: AnalyzeEmployeeDocumentInput): Promise<AnalyzeEmployeeDocumentOutput> {
  return analyzeEmployeeDocumentFlow(input);
}


/**
 * Defines the prompt for the Genkit AI model.
 * It takes the document image and instructs the AI to extract employee data
 * according to the provided output schema.
 */
const prompt = ai.definePrompt({
  name: 'analyzeEmployeeDocumentPrompt',
  input: {schema: AnalyzeEmployeeDocumentInputSchema},
  output: {schema: AnalyzeEmployeeDocumentOutputSchema},
  prompt: `You are an expert data entry assistant specializing in parsing employee data from documents. Analyze the provided document image.

  Extract the following information for each employee listed:
  1.  **name**: The full name of the employee.
  2.  **position**: The job title or position.
  3.  **salary**: The numerical salary. Remove any currency symbols (like $, €, ₹) and commas. If not present, use 0.
  4.  **description**: Any other relevant notes. If none, this can be omitted.

  Return the data as an array of employee objects.

  Document Image: {{media url=documentImage}}
  `,
});


/**
 * Defines the main Genkit flow for analyzing the employee document.
 * This flow takes the input, calls the AI with the defined prompt, and returns the structured output.
 */
const analyzeEmployeeDocumentFlow = ai.defineFlow(
  {
    name: 'analyzeEmployeeDocumentFlow',
    inputSchema: AnalyzeEmployeeDocumentInputSchema,
    outputSchema: AnalyzeEmployeeDocumentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    
    // Ensure output is not null, providing a fallback to an empty array if needed.
    return output ?? { employees: [] };
  }
);
