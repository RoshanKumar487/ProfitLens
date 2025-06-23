
'use server';
/**
 * @fileOverview An AI agent for analyzing documents containing employee lists.
 *
 * - analyzeEmployeeDocument - A function that handles the document analysis process.
 * - AnalyzeEmployeeDocumentInput - The input type for the analyzeEmployeeDocument function.
 * - AnalyzeEmployeeDocumentOutput - The return type for the analyzeEmployeeDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeEmployeeDocumentInputSchema = z.object({
  documentImage: z
    .string()
    .describe(
      "A photo of a document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeEmployeeDocumentInput = z.infer<typeof AnalyzeEmployeeDocumentInputSchema>;

const EmployeeSchema = z.object({
    name: z.string().describe("The full name of the employee."),
    position: z.string().describe("The job title or position of the employee."),
    salary: z.number().describe("The salary of the employee, as a number, with any currency symbols or commas removed."),
    description: z.string().optional().describe("Any additional notes or description for the employee."),
});

const AnalyzeEmployeeDocumentOutputSchema = z.object({
    employees: z.array(EmployeeSchema).describe("An array of employees extracted from the document.")
});
export type AnalyzeEmployeeDocumentOutput = z.infer<typeof AnalyzeEmployeeDocumentOutputSchema>;

export async function analyzeEmployeeDocument(input: AnalyzeEmployeeDocumentInput): Promise<AnalyzeEmployeeDocumentOutput> {
  return analyzeEmployeeDocumentFlow(input);
}

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

const analyzeEmployeeDocumentFlow = ai.defineFlow(
  {
    name: 'analyzeEmployeeDocumentFlow',
    inputSchema: AnalyzeEmployeeDocumentInputSchema,
    outputSchema: AnalyzeEmployeeDocumentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
