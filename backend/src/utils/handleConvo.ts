


import { GoogleGenerativeAI } from '@google/generative-ai';
import { allModel } from '../services/userPrompt';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function callGeminiWithHistory(
  history: string,
  userInput: string
): Promise<string> {
  //   const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const result = await allModel.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `You are a helpful assistant focused on conversations not involving receipts or database updates. Respond naturally to greetings, common questions, or chit-chat.\n\n---\nContextual chat begins:\n${history || 'new chat, no history'}\n\nUser: ${userInput}
            📌 Output Rules: (to be directly rendered to html)
            - Use clear, user-friendly language.
            - Use "\\n" for newlines instead of actual line breaks (so developers can split lines in React).
            - Use **bold**, _italics_, and bullet points or numbered lists where appropriate. 
            - Avoid HTML unless explicitly asked.  
            - Do not wrap responses in code blocks like triple backticks 
            - Avoid emojis unless asked.
            - Keep answers concise, unless the user asks for detailed explanations. 
            `,
          },
        ],
      },
    ],
  });

  const response = await result.response;
  return response.text();
}