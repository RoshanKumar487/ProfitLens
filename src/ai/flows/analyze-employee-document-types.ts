/**
 * @fileOverview Types and schemas for the employee document analysis flow.
 */
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
