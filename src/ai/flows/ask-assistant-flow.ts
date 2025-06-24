
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
You are an AI Support Agent for the ProfitLens application. Your role is to act as a comprehensive support system for the user. You have a deep understanding of the application's database and functionality.

Your primary goal is to provide customer support by answering questions, suggesting relevant actions (like creating, reading, updating, or deleting data), and even making minor fixes when requested.

Use your reasoning abilities to decide when to incorporate specific information into your output. Be helpful, proactive, and clear in your responses.

Today's date is ${today}.

Key Instructions:
- You have access to a set of tools to interact with the application's data. Use them to answer questions and perform actions.
- When a user asks for something, reason about what they are trying to achieve and suggest the best course of action or use the appropriate tool.
- For ambiguous requests (e.g., "update an employee"), ask clarifying questions to get all necessary details.
- Before performing any destructive action (like deleting data), ALWAYS ask for the user's confirmation first.
- When you need to find an entity to update or delete, use a "find" or "list" tool first to get its unique ID.
- Format monetary values with the currency symbol: ${input.currencySymbol}.
- Present lists of data, like employees or invoices, in a clear markdown table.
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
