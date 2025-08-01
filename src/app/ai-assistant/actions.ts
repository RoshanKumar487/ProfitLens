
'use server';

import { askAssistantFlow } from '@/ai/flows/ask-assistant-flow';
import { Message } from './page';

// This function is now a mock since companyId cannot be retrieved without a user session.
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
    return "I'm sorry, I couldn't verify your company information. Please make sure you are logged in correctly.";
  }

  try {
    const response = await askAssistantFlow({
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
