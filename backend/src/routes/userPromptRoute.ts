import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import { transcribeInput, userPrompts } from "../services/userPrompt";
import textToSpeech from "@google-cloud/text-to-speech";
import fs from "fs/promises"; // for file-based response if needed
import { deleteChatFromCache, getOrCreateChatSession } from "../utils/setGetChatCache";
import { db } from "../lib/firebase-admin";

const client = new textToSpeech.TextToSpeechClient();

export default async function userPromptRoute(app: FastifyInstance) {
  app.post(
    "/user-queries",
    async (
      req: FastifyRequest<{
        Body: {
          audioContent: string;
          textContent?: string;
          userId: string;
          chatId?: string;
          isChatEnd: boolean;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        console.log("📡 Incoming user query:", req.body);
        // const chatId = req.body.chatId;
        console.log(req.body, "___body___");
        console.log("Received user query:", req.body.userId);
        const { audioContent, textContent, userId, chatId, isChatEnd } =
          req.body;
        // const hardcodedUserId = 'user_09882b53-28d3-4c12-9933-5c90d2b6b6e5';
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // If isChatEnd is true, we should end the chat session
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        if (isChatEnd) {
          console.log("Ending chat session for user:", userId);
          const chatData = await getOrCreateChatSession({
            chatId,
            userId,
            question: "",
          });
          try {
            const chatSnapshot = await db
              .collection("chats")
              .doc(chatId as string)
              .set({
                chatId: chatData.chatId,
                userId: chatData.userId,
                chatName: chatData.chatName,
                startedAt: chatData.startedAt,
                lastActive: chatData.lastActive,
                history: chatData.history,
              });

            const deleteCacheChat = deleteChatFromCache(chatId as string);           // add error handling

            console.log(`✅ Chat with ID ${chatId} saved to Firestore.`);
            return { success: true };
          } catch (error) {
            console.error(
              `❌ Error saving chat ${chatId} to Firestore:`,
              error
            );
            return { success: false, message: (error as Error).message };
          }
         
        }

        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // FIRST TRANSCRIBING THE TEXT & SPEECH
        //////////////////////////////////////////////////////////////////////////////////////////////////////

        let transcribed = "";
        if (audioContent) {
          // audio path: decode base64 and treat as audio input
          const audioResult = await transcribeInput({ audioContent }, userId);
          if (!audioResult.success) {
            return reply.status(400).send({ error: audioResult.error });
          } else if (audioResult.success) {
            transcribed = audioResult.transcription;
            console.log("✅ Transcribed text:", transcribed);
          }
          // const promptResult = await userPrompts({ audioContent }, userId);

          // const text = promptResult.receiptResults?.summary || "Sorry, I didn't get that.";

          // const [response] = await client.synthesizeSpeech({
          //     input: { text },
          //     voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
          //     audioConfig: { audioEncoding: "MP3" },
          // });

          // const audioBase64 = response.audioContent?.toString("base64");

          // return reply.send({
          //     ...promptResult,
          //     audioBase64,
          // });
        } else if (textContent) {
          console.log("Received textContent:", textContent);
          // text path: send directly as a string
          const textResult = await transcribeInput({ textContent }, userId);

          console.log("Text transcription result:", textResult);
          if (!textResult.status) {
            return reply.status(400).send({ error: textResult.error });
          } else if (textResult.status) {
            transcribed = textResult.transcription;
            console.log("✅ Transcribed text:", transcribed);
          }
        } else {
          return reply
            .status(400)
            .send({ error: "No audioContent or textContent provided" });
        }
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // now run it through the userPrompt thingy
        //////////////////////////////////////////////////////////////////////////////////////////////////////
        console.log("🤖 Calling userPrompts with transcription...");
        const promptResult = await userPrompts(transcribed, userId, chatId);
        console.log("🧾 Prompt result received:", promptResult);

        const text =
          promptResult.summary || "Sorry, I didn't get that.";

        const [response] = await client.synthesizeSpeech({
          input: { text },
          voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
          audioConfig: { audioEncoding: "MP3" },
        });

        const audioBase64 = response.audioContent?.toString("base64");

        console.log("📨 Sending response with audio and summary...");
        return reply.send({
          response: text,
          // audioBase64,
          chatId: promptResult.chatId,
        // response: "you got this baby"
      });
      } catch (error) {
        console.error("Error:", error);
        reply.status(500).send({ error: "Failed to process user query" });
      }
    }
  );
}
