import { SpeechClient } from "@google-cloud/speech";
import { google } from "@google-cloud/speech/build/protos/protos";
import { embed } from "../lib/embed-vertex";
import { streamlinedRAGQuery } from "./indUserQuery";
import { generateFireStoreQuery } from "./buildGeminiQuery";

async function createQueryEmbedding(text: string): Promise<number[]> {
  try {
    // Use your existing embed function with RETRIEVAL_QUERY task type
    const embedding = await embed(text, {
      taskType: "RETRIEVAL_QUERY", // Important: Use QUERY for search queries
      dimensions: 768, // Match the dimensions of your stored embeddings
      normalize: true, // Keep normalization consistent
    });

    // Since embed can return number[] | number[][], ensure we get number[]
    return Array.isArray(embedding[0]) ? embedding[0] : (embedding as number[]);
  } catch (error) {
    console.error("Error creating query embedding:", error);
    throw error;
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { handleVoiceTextAddQuery } from "../utils/voiceTextAddQuery";
import {
  addToChatHistory,
  getOrCreateChatSession,
} from "../utils/setGetChatCache";
import { saveReceiptToFirestore } from "../utils/storeReceiptData";
import { db } from "../lib/firebase-admin";
import { now } from "../routes/saveReceipt";
import { callGeminiWithHistory } from "../utils/handleConvo";

const speechClient = new SpeechClient();

interface UserPromptsResult {
  transcription: string;
  receiptResults?: {
    summary: string | null;
    // receipts: any[];
    count: number;
    query?: any;
    searchText?: string;
    insights?: any;
  };
  error?: string;
}

export const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY as string
);
export const allModel = genAI.getGenerativeModel({
  model: process.env.MODEL as string,
});

export async function detectIntent({
  text,
  context,
}: {
  text: string;
  context: string;
}): Promise<"add" | "fetch" | "convo"> {
  const prompt = `
You are an intent classifier. Your job is to look at the latest message in a chat and classify it into one of three categories: "add", "fetch", or "convo".

-If the latest message is "yes" or "no", look at the context to decide. For example:
  + If the previous message was asking for confirmation to log something, return "add"
  + If it was casual conversation, return "convo"
- Return **"add"** if the message is trying to log or record something, like "I bought groceries", "Add this expense", or "I got fuel".
- Return **"fetch"** if the message is asking to view or retrieve information, like "Show me my receipts", "Get my last expenses", or "Find grocery bills".
- Return **"convo"** if the message is just small talk or general conversation, like "hi", "hello", "thank you", "how are you", "good morning", "sorry", or similar.

Only return one word: "add", "fetch", or "convo".

Context:
${context}

Latest message:
"${text}"

Intent:
`;
  const result = await allModel.generateContent(prompt);
  const raw = await result.response.text();
  const cleaned = raw.trim().toLowerCase();
  return cleaned === "add" ? "add" : cleaned === "fetch" ? "fetch" : "convo";
}

export const transcribeInput = async (
  params: { audioContent?: string; textContent?: string },
  userId: string,
  includeInsights: boolean = true
): Promise<any> => {
  const { audioContent, textContent } = params;
  //--------------------------------------------------------------------
  // 1. Get the transcription
  //--------------------------------------------------------------------
  let transcription = "";

  if (audioContent) {
    try {
      const [sttResponse] = await speechClient.recognize({
        audio: { content: audioContent },
        config: {
          encoding: "WEBM_OPUS",
          sampleRateHertz: 48000,
          languageCode: "en-US",
        },
      });

      transcription =
        sttResponse.results
          ?.map(
            (r: google.cloud.speech.v1.ISpeechRecognitionResult) =>
              r.alternatives?.[0]?.transcript ?? ""
          )
          .join("\n")
          .trim() ?? "";

      if (!transcription) {
        return {
          status: false,
          transcription: "",
          error: "No speech detected in audio",
        };
      }
    } catch (e) {
      console.error("Speech-to-text error:", e);
      return {
        status: false,
        transcription: "",
        error: `Speech recognition failed: ${(e as Error).message}`,
      };
    }
    /* ---------- TEXT PATH ---------- */
  } else if (textContent) {
    transcription = textContent.trim();
    if (!transcription) {
      return { transcription: "", error: "Empty textContent provided" };
    }
  } else {
    return {
      transcription: "",
      error: "Neither audioContent nor textContent supplied",
    };
  }

  /* ------------ SUCCESS OF TRANSCRIPTION -------------*/
  console.log("✅ Transcription complete:", transcription);
  return {
    status: true,
    transcription,
    error: "",
  };
};

/**
 * Accepts EITHER `audioContent` (base-64 WebM/OPUS) OR `textContent` (plain UTF-8).
 * If both are provided, `audioContent` wins.
 */
export const userPrompts = async (
  transcription: string,
  userId: string,
  chatId?: string,
  includeInsights: boolean = true
): Promise<any> => {
  console.log("Query text:", transcription);
  //--------------------------------------------------------------------
  // 1.  Get/create chatcache
  //--------------------------------------------------------------------
  const chatContext = await getOrCreateChatSession({
    userId,
    chatId,
    question: transcription,
  });
  console.log("🧠 Chat session info:", chatContext);

  const updatedChat = addToChatHistory({
    chatId: chatContext.chatId,
    type: "user",
    question: transcription,
  });
  console.log("📝 Chat history updated:", updatedChat);

  //--------------------------------------------------------------------
  // 2.  Intent detection
  //--------------------------------------------------------------------
  // getting context from chatcontext
  const recentHistory =
    chatContext.history.length > 0
      ? chatContext.history
          .slice(-8)
          .map(
            (h) =>
              `${h.type.toLowerCase() === "user" ? "User" : "Bot"}: ${
                h.context
              }`
          )
          .join("\n")
      : "new chat, no history";

  //ACTUAL INTENT DETECTION
  const intent = await detectIntent({
    text: transcription,
    context: recentHistory,
  });
  console.log("🎯 Detected intent:", intent);
  ////////////////////////////////////////////////////////////////////////
  // Based on the intent, We are ADDING to DB
  ////////////////////////////////////////////////////////////////////////
  if(intent === "convo") {
    console.log("Intent is 'convo', returning chat context without further processing.");
    const convoResult = await callGeminiWithHistory(recentHistory, transcription);

    return {summary: convoResult};
  }
  if (intent === "add") {
    console.log("📥 Running add-to-DB query...");

    //we need to make a query to add to the db and send a prompt back.
    const addQueryResult = await handleVoiceTextAddQuery(
      transcription,
      userId,
      recentHistory
    );

    const jsonMatch = addQueryResult?.message.match(/```json\n([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1] : addQueryResult?.message;
    const parsed = JSON.parse(jsonString);
    console.log("📤 Add query result:", addQueryResult, parsed);
    if (!parsed?.validationPassed) {
      addToChatHistory({
        chatId,
        question: addQueryResult?.message,
        type: "bot",
      });
      console.log("Not Saving receipt to Firestore, asking more questions...");
      return {
        transcription,
        summary: parsed.data,
        chatId: updatedChat.chat?.chatId,
      };
    }
    if (parsed?.validationPassed === true) {
      addToChatHistory({
        chatId,
        question: addQueryResult?.message,
        type: "bot",
      });

      // Save the receipt to Firestore
if(!parsed.addToDb){
      // --- Confirmation prompt refactor ---
      const r = parsed.data.receipt;
      const itemSummary =
        r.items && r.items.length > 0
          ? r.items
              .map((item:any) => `${item.quantity || 1} ${item.name} for ₹${item.price}`)
              .join(", ")
          : "No items listed";

      const confirmationPrompt = `You're about to save this receipt:\n- Vendor: ${r.vendor}\n- Items: ${itemSummary}\n- Total: ₹${r.amount}\n- Date: ${r.date}\n\nShall I add this to the database? Reply with "yes" or "no".`;

      return {
        transcription,
        summary: confirmationPrompt,
        chatId: updatedChat.chat?.chatId,
      };
}
      // --- End confirmation prompt refactor ---
if(parsed.addToDb){
      console.log("Saving receipt to Firestore...");
      const newObject = parsed.data.receipt;
      console.log("Saving receipt to Firestore...");
      const dbAddition = await saveReceiptToFirestore({
        userId,
        vendor: newObject.vendor,
        amount: newObject.amount,
        // category: newObject.category,
        confidence: newObject.confidence,
        date: newObject.date || now,
        items: newObject.items || [],
        notes: newObject.notes || "",
      });
      return {
        transcription,
        receiptResults: {
          ...dbAddition,
        },
        summary: `Receipt saved successfully!`,
      };
    }
  }
  }

  //--------------------------------------------------------------------
  // 2. Run the Firestore / receipts query with fallback
  //--------------------------------------------------------------------
  if (intent === "fetch") {
    try {
      // try {
      //   console.log("🚀 Using optimized vector search");
      //   const fallbackResult = await generateFireStoreQuery(transcription, userId);
      //   return fallbackResult;

      // } catch (optErr: any) {
      //   console.warn(
      //     "⚠️ Optimized search failed, falling back to original:",
      //     optErr.message
      //   );
      // }
      let optimizedResult;
      if (typeof createQueryEmbedding === "function") {
        try {
          optimizedResult = await streamlinedRAGQuery(
            transcription,
            userId,
            createQueryEmbedding
          );
          console.log("Result from streamlinedRAGQuery:", optimizedResult);
          console.log("optimizedResult.success:", optimizedResult.success);
        } catch (optErr: any) {
          console.error("Error during streamlinedRAGQuery:", optErr);
          // If an error occurs, explicitly set optimizedResult to indicate failure
          optimizedResult = { success: false, error: optErr.message };
        }

        if (!optimizedResult.success) {
          console.log(
            "Streamlined RAG query failed, falling back to Firestore."
          );
          optimizedResult = await generateFireStoreQuery(transcription, userId);
        }

        console.log(optimizedResult, "____result___");
        return optimizedResult;
      }
    } catch (queryErr: any) {
      console.error("Receipt query error:", queryErr);
      return {
        transcription,
        error: `Receipt query failed: ${queryErr.message}`,
      };
    }
  }
};
