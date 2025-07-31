import { Firestore } from '@google-cloud/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { messaging } from 'firebase-admin';

const firestore = new Firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const intentModel = genAI.getGenerativeModel({ model: process.env.MODEL || 'gemini-1.5-flash' });

export async function handleVoiceTextAddQuery(
  transcription: string,
  userId: string,
  recentHistory: string
) {
  console.log("Handling voice text add query:", transcription, userId, recentHistory);
 const extractPrompt = `
You are an intelligent assistant that extracts receipt and item data from the user's message and converts it into Firestore-compatible JSON.

Here is the recent conversation:
${recentHistory}

User said:
"${transcription}"

If the history has all the data and the user is giving confirmation, then return the receipt with giving confirmation to add in db.

categories set:
[
“Groceries & Pantry”
“Beverages”
“Personal Care & Beauty”
“Health & Wellness”
“Home & Cleaning Supplies”
“Baby Kids & Maternity”
“Fashion & Accessories”
“Electronics & Gadgets”
“Home & Kitchen Appliances”
“Pets Garden & Auto”
“Miscellaneous & Extras”
]

Extract and format the output into this structure:

{
  "receipt": {
    "receiptId": string (generate a UUID),
    "userId": "${userId}",
    "vendor": string, // merchant or source of receipt #REQUIRED FROM USER
    "amount": number, // total price #REQUIRED FROM USER
    "confidence": number between 0 and 1 (how confident are you in the extraction),
    "createdAt": ISO timestamp string,
    "date": "YYYY-MM-DD" (optional),
    "notes": string (optional),
    "items": [           #REQUIRED FROM USER
      {
        "name": string,
        "price": number,
        "quantity": number,
        "category": string (use best guess or add to “Miscellaneous”) #ALWAYS GENERATED, NEVER FROM USER
      }
    ]
  }
}

If any required field is missing, clearly state what is missing instead of returning the full JSON.

Respond in the structure:
{
  validationPassed: Boolean,
  data: {} // follow the rules below,
  addToDb: Boolean // true if the data is complete and user has given consent to add.
}
  📌 data output Rules: (to be directly rendered to html)
            - Use clear, user-friendly language.
            - Use "\\n" for newlines instead of actual line breaks (so developers can split lines in React).
            - Use **bold**, _italics_, and bullet points or numbered lists where appropriate. 
            - Avoid HTML unless explicitly asked.  
            - Do not wrap responses in code blocks like triple backticks 
            - Avoid emojis unless asked.
            - Keep answers concise, unless the user asks for detailed explanations. 
`;

  const structuredResult = await intentModel.generateContent(extractPrompt);
  const structuredResponse = await structuredResult.response.text();

  console.log("Structured response:", structuredResponse);
  let parsed;
  try {
    parsed = JSON.parse(structuredResponse);
  } catch (e) {
    return {
      success: false,
      message: structuredResponse,
      count: 0,
    };
  }

//   if (!parsed.receipt || !parsed.items || !Array.isArray(parsed.items)) {
//     return {
//       success: false,
//       message: 'Missing receipt or items structure.',
//       count: 0,
//     };
//   }
console.log("data_got_from_the_trext", parsed)

if(!parsed.validationPassed || !parsed.data.receipt){
    return{
        success: false,
        message: parsed.data
    }
}

if(parsed.validationPassed){
    return {
        success: true,
        message: parsed.data
    }
}

//   const receiptRef = await firestore.collection('receipts').add({
//     ...parsed.receipt,
//     timestamp: new Date(),
//   });

//   await Promise.all(
//     parsed.items.map((item: any) =>
//       firestore.collection('items').add({
//         ...item,
//         receipt_id: receiptRef.id,
//         user_id: parsed.receipt.user_id,
//         timestamp: new Date(),
//       })
//     )
//   );

//   return {
//     success: true,
//     message: `Stored receipt and ${parsed.items.length} items successfully.`,
//     count: parsed.items.length,
//   };
}