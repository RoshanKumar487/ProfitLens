
'use server';

import { askAssistant, askAssistantFlow } from '@/ai/flows/ask-assistant-flow';
import type { Message } from '@/components/AssistantChat';

// This function is now a mock since authentication is disabled.
async function getCompanyIdForCurrentUser(): Promise<string | null> {
  console.log("Mocking companyId for AI Assistant");
  return 'mock-company-123';
}


export async function askAssistantAction(
  history: Message[],
  currencySymbol: string
): Promise<string> {
  const companyId = await getCompanyIdForCurrentUser();

  if (!companyId) {
    return "I'm sorry, I couldn't verify your company information. Please try again.";
  }

  try {
    // We can call the exported function directly or the flow.
    // Calling the function directly might be slightly simpler if we don't need flow-specific features here.
    const response = await askAssistant({
      history: history,
      companyId: companyId,
      currencySymbol: currencySymbol,
    });
    return response;
  } catch (error) {
    console.error("Error in askAssistantAction:", error);
    return "Sorry, I encountered an error trying to respond. The AI service might be unavailable.";
  }
}
