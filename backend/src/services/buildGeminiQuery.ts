import { db } from '../lib/firebase-admin';
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
 
function resolveDateKeyword(keyword: string) {
  const today = new Date(), yr = today.getFullYear();
  const startOfWeek = (d: Date) => {
    const n = d.getDay(); const s = new Date(d); s.setDate(d.getDate() - n); s.setHours(0, 0, 0, 0); return s;
  };
  switch (keyword) {
    case 'this_week': return { start: startOfWeek(today), end: today };
    case 'last_week': {
      const end = new Date(startOfWeek(today)); end.setDate(end.getDate() - 1);
      const start = new Date(end); start.setDate(end.getDate() - 6); return { start, end };
    }
    case 'this_month': { const start = new Date(yr, today.getMonth(), 1); return { start, end: today }; }
    case 'last_month': {
      const start = new Date(yr, today.getMonth() - 1, 1);
      const end = new Date(yr, today.getMonth(), 0); return { start, end };
    }
    case 'this_quarter': {
      const q = Math.floor(today.getMonth() / 3); const start = new Date(yr, q * 3, 1);
      return { start, end: today };
    }
    case 'indian_fy': {
      const fyStart = new Date(today.getMonth() < 3 ? yr - 1 : yr, 3, 1);
      const fyEnd = new Date(fyStart.getFullYear() + 1, 2, 31, 23, 59, 59); return { start: fyStart, end: fyEnd };
    }
    default: return null;
  }
}
 
type Intent =
  | 'TOTAL_SPENDING'
  | 'AVERAGE_SPENDING'
  | 'CATEGORY_SPENDING'
  | 'PAYMENT_MODE_SPLIT'
  | 'MERCHANT_SPENDING'
  | 'THRESHOLD_EXPENSES'
  | 'MOST_EXPENSIVE'
  | 'AVERAGE_DAILY'
  | 'UNKNOWN'
  | 'CHEAPEST'
 
interface Cls {
  intent: Intent;
  filters: {
    dateKeyword?: string;
    category?: string;
    merchants?: string[];
    paymentMode?: 'cash' | 'upi' | 'card' | 'digital';
    minAmount?: number;
  };
  aggregation?: 'sum' | 'avg' | 'count' | 'max';
}
 
function cleanAiJsonResponse(s: string) {
  return s
    .replace(/^```json[\r\n]*/i, '')
    .replace(/^```[\r\n]*/i, '')
    .replace(/```[\r\n]*$/g, '')
    .trim();
}
 
function truncateAfterFirstJsonBlock(s: string) {
  const end = s.lastIndexOf('}');
  return end !== -1 ? s.slice(0, end + 1) : s;
}
 
async function classify(prompt: string): Promise<Cls> {
  const model = genAI.getGenerativeModel({ model: process.env.MODEL });
  const sys = `
Classify an Indian personal-finance query into one of these intents:
- TOTAL_SPENDING: Total amount spent
- AVERAGE_SPENDING: Average spending amount
- CATEGORY_SPENDING: Spending by category
- PAYMENT_MODE_SPLIT: Split by payment method
- MERCHANT_SPENDING: Spending at specific merchants
- THRESHOLD_EXPENSES: Expenses above/below threshold
- MOST_EXPENSIVE: Most expensive items/transactions
- CHEAPEST: Least expensive items/transactions
- AVERAGE_DAILY: Daily average spending
- UNKNOWN: Cannot classify
- CHEAPEST: Cheapest items/transactions
 
Your response MUST be valid JSON. Examples:
 
For "average spending":
{
  "intent": "AVERAGE_SPENDING",
  "filters": {},
  "aggregation": "avg"
}
 
For "total spent on food last month":
{
  "intent": "CATEGORY_SPENDING",
  "filters": {
    "category": "food",
    "dateKeyword": "last_month"
  },
  "aggregation": "sum"
}
 
Respond only with JSON, no other text.`;
 
  const txt = (await model.generateContent([sys, prompt])).response.text();
  const cleaned = truncateAfterFirstJsonBlock(cleanAiJsonResponse(txt));
 
  try {
    console.log('[classify()] Attempting to parse:\n', cleaned);
    const result = JSON.parse(cleaned);
 
    // Handle "average spending" specifically
    if (prompt.toLowerCase().includes('average') && !result.intent.includes('AVERAGE')) {
      result.intent = 'AVERAGE_SPENDING';
      result.aggregation = 'avg';
    }
 
    return result;
  } catch (err) {
    console.error('[classify()] Gemini malformed JSON:\n', cleaned);
    // Fallback for "average spending"
    if (prompt.toLowerCase().includes('average')) {
      return {
        intent: 'AVERAGE_SPENDING',
        filters: {},
        aggregation: 'avg'
      };
    }
    throw new Error(`Gemini JSON parse error: ${(err as Error).message}`);
  }
}
 
type C = {
  type: 'where' | 'orderBy' | 'limit',
  field?: string,
  operator?: FirebaseFirestore.WhereFilterOp,
  value?: any,
  direction?: 'asc' | 'desc'
};
 
function buildQuery(uid: string, cls: Cls) {
  // Start with just userId filter to match your actual data structure
  const cons: C[] = [{ type: 'where', field: 'userId', operator: '==', value: uid }];
  const shape: any = { flattenCategorizedItems: false };
 
  function safePushWhere(arr: C[], field: string, op: FirebaseFirestore.WhereFilterOp, value: any) {
    if (value !== undefined && value !== null && !(value instanceof Date && isNaN(+value))) {
      arr.push({ type: 'where', field, operator: op, value });
    }
  }
 
  // Only add date filters if specified
  if (cls.filters.dateKeyword) {
    const rng = resolveDateKeyword(cls.filters.dateKeyword);
    if (rng) {
      // Use 'date' field as shown in your web query results
      safePushWhere(cons, 'date', '>=', rng.start.toISOString().split('T')[0]); // Convert to YYYY-MM-DD format
      safePushWhere(cons, 'date', '<=', rng.end.toISOString().split('T')[0]);
    }
  }
 
  // For category, add to post-processing filters
  if (cls.filters.category) {
    shape.categoryFilter = cls.filters.category;
  }
 
  // Keep merchant filtering in post-processing - use 'vendor' field from your data
  if (cls.filters.merchants) {
    shape.merchantList = cls.filters.merchants.map(m => m.toLowerCase());
  }
 
  // Keep payment mode in post-processing
  if (cls.filters.paymentMode) {
    shape.paymentFilter = cls.filters.paymentMode;
  }
 
  // Keep amount threshold in post-processing
  if (cls.filters.minAmount) {
    shape.minAmount = cls.filters.minAmount;
  }
 
  // Handle sorting
  if (cls.intent === 'MOST_EXPENSIVE') {
    shape.sortByAmount = 'desc';
    shape.limitResults = 1;
  }
 
  return { cons, shape };
}
 
async function fetchDocs(cons: C[], userId: string) {
  console.log('Fetching documents from receipts collection...');
 
  try {
    // Query the receipts collection directly (this matches your web query)
    let q: FirebaseFirestore.Query = db.collection('receipts');
 
    // Apply user_id filter (field name is 'userId' based on your web query results)
    q = q.where('userId', '==', userId);
 
    // Apply other filters from cons if any
    cons.forEach(c => {
      if (c.type === 'where' && c.field && c.field !== 'user_id' && c.field !== 'userId') {
        // Map user_id to userId for consistency
        const field = c.field === 'user_id' ? 'userId' : c.field;
        q = q.where(field, c.operator!, c.value);
      } else if (c.type === 'orderBy') {
        q = q.orderBy(c.field!, c.direction!);
      } else if (c.type === 'limit') {
        q = q.limit(c.value);
      }
    });
 
    console.log('Querying receipts collection with userId filter...');
    const result = await q.get();
    console.log(`Found ${result.docs.length} receipts for user`);
 
    return result.docs;
 
  } catch (e: any) {
    console.error('Error fetching from receipts collection:', e);
 
    if (e.code === 9) {
      console.warn('Receipts query with filters failed. Trying basic userId query...');
      try {
        // Fallback to just userId filter
        const basicQuery = db.collection('receipts').where('userId', '==', userId);
        const result = await basicQuery.get();
        console.log(`Basic query found ${result.docs.length} receipts`);
        return result.docs;
      } catch (e2: any) {
        console.error('Even basic userId query failed:', e2);
        throw e2;
      }
    }
    throw e;
  }
}
 
function shapeDocs(docs: any[], shape: any) {
  let results: any[] = [];
 
  // Process each receipt document
  docs.forEach(d => {
    const receiptData = d.data();
 
    // Extract items array from the receipt (as shown in your web query)
    const items = receiptData.items || [];
 
    // Create individual item records
    items.forEach((item: any) => {
      const itemRecord = {
        // Item properties
        name: item.name,
        price: item.price || 0,
        quantity: item.quantity || 1,
 
        // Receipt-level properties
        category: receiptData.category,
        vendor: receiptData.vendor,
        receiptId: receiptData.receiptId || d.id,
        userId: receiptData.userId,
        date: receiptData.date,
        createdAt: receiptData.createdAt,
        amount: receiptData.amount, // Total receipt amount
 
        // Calculate individual item total
        total: (item.price || 0) * (item.quantity || 1)
      };
      results.push(itemRecord);
    });
  });
 
  console.log(`Shaped ${results.length} individual items from ${docs.length} receipts`);
 
  // Apply post-processing filters
  results = results.filter(r => {
    if (shape.categoryFilter && r.category !== shape.categoryFilter) return false;
    if (shape.merchantList && !shape.merchantList.includes((r.vendor || '').toLowerCase())) return false;
    if (shape.minAmount && r.price < shape.minAmount) return false;
    if (shape.paymentFilter && r.paymentMode !== shape.paymentFilter) return false;
    return true;
  });
 
  // Apply sorting if needed
  if (shape.sortByAmount === 'desc') {
    results.sort((a, b) => b.amount - a.amount); // Sort by receipt amount
  } else if (shape.sortByPrice === 'desc') {
    results.sort((a, b) => b.price - a.price); // Sort by item price
  }
 
  // Apply limit if needed
  if (shape.limitResults) {
    results = results.slice(0, shape.limitResults);
  }
 
  return results;
}
 
export async function summarize(
  prompt: string,
  rows: any[],
  cls: Cls,
): Promise<string> {
  console.log(`Summarizing ${rows.length} rows for intent: ${cls.intent}`);
 
  if (!rows.length) {
    return "No expenses found for your query.";
  }
 
  // Handle average spending specifically
  if (cls.intent === 'AVERAGE_SPENDING' || prompt.toLowerCase().includes('average')) {
    const total = rows.reduce((sum, r) => sum + (r.price || 0), 0);
    const average = total / rows.length;
    return `Your average spending is ₹${average.toFixed(2)} per item. Total: ₹${total.toLocaleString('en-IN')} across ${rows.length} items.`;
  }
 
  if (cls.intent === 'TOTAL_SPENDING') {
    const total = rows.reduce((sum, r) => sum + (r.price || 0), 0);
    return `You spent ₹${total.toLocaleString('en-IN')} total across ${rows.length} items.`;
  }
 
  if (cls.intent === 'MOST_EXPENSIVE') {
    const mostExpensive = rows[0]; // Already sorted
    return `Your most expensive item was ${mostExpensive.name} for ₹${mostExpensive.price.toLocaleString('en-IN')}.`;
  }
 
  // Fallback: ask Gemini to craft a summary
  const mdl = genAI.getGenerativeModel({ model: process.env.MODEL });
  const res = await mdl.generateContent([
    'Summarize this user expense data in one clear sentence (Indian context).',
    `User Query: ${prompt}`,
    `Data Summary: ${rows.length} items, Total: ₹${rows.reduce((sum, r) => sum + (r.price || 0), 0).toLocaleString('en-IN')}`,
    `Sample items: ${rows.slice(0, 3).map(r => `${r.name} - ₹${r.price}`).join(', ')}`
  ]);
 
  return res.response.text().trim();
}
 
export async function generateFireStoreQuery(prompt: string, userId: string) {
  try {
    console.log(`Processing query: "${prompt}" for user: ${userId}`);
 
    // 2️⃣ Fallback to keyword search
    console.log('Falling back to keyword search...');
    const cls = await classify(prompt);
    console.log('Classification result:', cls);
 
    const { cons, shape } = buildQuery(userId, cls);
    console.log('Query constraints:', cons);
 
    const docs = await fetchDocs(cons, userId);
    console.log(`Fetched ${docs.length} documents`);
 
    const rows = shapeDocs(docs, shape).map(stripEmbedding);
    console.log(`Shaped to ${rows.length} rows`);
 
    const summary = await summarize(prompt, rows, cls);
 
    return {
      success: true,
      summary,
      rawResults: rows,
      source: 'keyword',
      intent: cls.intent,
      totalItems: rows.length
    };
 
  } catch (err: any) {
    console.error('[generateFireStoreQuery] Error:', err);
    return {
      success: false,
      error: err.message,
      summary: "I encountered an error processing your request. Please try again."
    };
  }
}
 
const MAX_DIST = 0.45;
 
const stripEmbedding = <T extends { embedding?: any }>(row: T) =>
  Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'embedding')) as
  Omit<T, 'embedding'>;