
'use server';
/**
 * @fileOverview The main Genkit flow for the AI Assistant.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { allTools } from '../tools';
import { format } from 'date-fns';

const AssistantInputSchema = z.object({
    history: z.array(z.any()).describe("The chat history between the user and the assistant."),
    companyId: z.string().describe("The ID of the user's company."),
    currencySymbol: z.string().describe("The currency symbol for the user's company."),
});

export const askAssistantFlow = ai.defineFlow(
    {
        name: 'askAssistantFlow',
        inputSchema: AssistantInputSchema,
        outputSchema: z.string(),
    },
    async (input) => {
        const today = format(new Date(), 'PPPP');

        const systemPrompt = `
You are ProfitLens AI, a helpful and friendly assistant for the ProfitLens application. Your goal is to help users manage their business data efficiently.

Today's date is ${today}.

You have access to a set of tools to perform actions like adding, listing, or updating data for employees, invoices, and expenses.

- When a user asks to perform an action, use the available tools.
- Before performing any destructive action (like deleting), ALWAYS ask for the user's confirmation first.
- If a user's request is ambiguous (e.g., "update the employee"), ask clarifying questions to get the necessary information (e.g., "Which employee would you like to update? What is their name?").
- When you need to find an entity to update or delete it, use the appropriate "find" or "list" tool first to get its ID.
- When you provide information containing monetary values, format it nicely and include the currency symbol: ${input.currencySymbol}.
- When you return a list of items (like employees or invoices), format it as a markdown table for easy readability.
- Be concise and clear in your responses.
`;

        // We need to inject the companyId into the tool inputs.
        // The LLM doesn't know about companyId, it's a security measure.
        // We can augment the last user message to include it in a structured way
        // that the tool input schema can parse.
        const lastMessage = input.history.pop();
        if (!lastMessage || lastMessage.role !== 'user') {
            return "I'm sorry, I don't have a user message to respond to.";
        }
        
        const augmentedPrompt = `
User question: "${lastMessage.content}"

Based on the user's question, call the appropriate tool. Your context for all tool calls is companyId: "${input.companyId}".
`;

        const llmResponse = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            tools: allTools,
            prompt: augmentedPrompt,
            system: systemPrompt,
            history: input.history,
            config: {
                // Attach the companyId to every tool request's input
                toolRequest: (input) => ({ ...input, companyId: input.companyId }),
            },
        });

        return llmResponse.text;
    }
);
