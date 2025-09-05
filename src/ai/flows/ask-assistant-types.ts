/**
 * @fileOverview Types and schemas for the AI Assistant flow.
 */
import { z } from 'zod';

/**
 * Zod schema for the input of the AI assistant flow.
 */
export const AskAssistantInputSchema = z.object({
    history: z.array(z.any()).describe("The chat history between the user and the assistant."),
    companyId: z.string().describe("The ID of the user's company."),
    currencySymbol: z.string().describe("The currency symbol for the user's company."),
});
export type AskAssistantInput = z.infer<typeof AskAssistantInputSchema>;

// The output is a simple string for the chat response.
export type AskAssistantOutput = string;
