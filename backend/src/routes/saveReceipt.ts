import { FastifyInstance } from "fastify";
import { cleanUndefinedValues } from "../middleware/categorizeAndSave";
import { randomUUID } from "crypto";
import { db } from "../lib/firebase-admin"; // This should be from Firebase Admin SDK
import { diagnosticCreateReceiptPass } from "../services/googleWallet";
import { embed } from "../lib/embed-vertex";
import { Timestamp } from "firebase-admin/firestore";

export const now = Timestamp.now();

export default function saveReceipts(app: FastifyInstance) {
    const PRICE_BUCKET = (p: number) =>
        p >= 1000 ? "₹1000_plus" :
            p >= 500 ? "₹500_999" :
                p >= 100 ? "₹100_499" :
                    "₹0_99";

    app.post("/save-receipt", async (req, reply) => {
        const { userId, editedCategorization } = req.body as {
            userId: string;
            editedCategorization: {
                vendor: string;
                date: string;
                amount: number;
                category: string;
                items: { name: string; price: number; quantity: number }[];
                notes?: string;
                confidence?: number;
            };
        };

        if (!userId || !editedCategorization) {
            return reply.status(400).send({ error: "Missing userId or categorization" });
        }

        try {
            /* ── 1. save the receipt itself ───────────────────────── */
            const cleanedData = cleanUndefinedValues(editedCategorization);
            const receiptId = randomUUID();
            console.log("cleanedData", cleanedData, receiptId);

            const receiptRef = db.collection("receipts").doc(receiptId);
            await receiptRef.set({
                userId,
                receiptId,
                ...editedCategorization,
                createdAt: now,
            });

            /* ── 2. prepare item-level embeddings ─────────────────── */
            const embedInputs = editedCategorization.items.map(
                it => `${it.name} | ${editedCategorization.category} | ${PRICE_BUCKET(it.price)} | ${editedCategorization.vendor}`
            );

            console.log("Generating embeddings for inputs:", embedInputs);
            const vecs = await embed(embedInputs, { taskType: "RETRIEVAL_DOCUMENT" }) as number[][];
            console.log(`Generated ${vecs.length} embeddings, each with ${vecs[0]?.length} dimensions`);

            /* ── 3. batch-write items into a **sub-collection** ───── */
            const batch = db.batch();

            editedCategorization.items.forEach((it, idx) => {
                const itemData = {
                    user_id: userId,
                    receipt_id: receiptId,
                    vendor: editedCategorization.vendor,
                    purchase_date: editedCategorization.date,
                    name: it.name,
                    price: it.price,
                    quantity: it.quantity,
                    category_name: editedCategorization.category,
                    embedding: vecs[idx], // ✅ This is the actual embedding vector
                    created_at: now,
                };

                console.log(`Writing embedding for item ${idx + 1}:`, {
                    ...itemData,
                    embedding: `[${vecs[idx].length} dimensions]` // Don't log full vector
                });

                // ✅ THIS WAS MISSING! Actually write to the batch
                const itemRef = receiptRef.collection('embeddings').doc();
                batch.set(itemRef, itemData);
            });

            // Now commit the batch (it actually has data now!)
            await batch.commit();
            console.log(`✅ Successfully saved ${editedCategorization.items.length} items with embeddings`);

            const dataOnPass = {
                receiptId,
                amount: cleanedData.amount,
                totalItems: cleanedData.items.length,
                date: cleanedData.date,
                vendor: cleanedData.vendor,
            }

            console.log("dataOnPass", dataOnPass);
            const url = await diagnosticCreateReceiptPass(dataOnPass);
            console.log("url", url);

            return reply.send({
                success: true,
                message: "Receipt and line-items stored with embeddings",
                receiptId,
                passUrl: url,
                itemsInserted: editedCategorization.items.length,
            });

        } catch (err: any) {
            req.log.error(err, "Failed to save receipt");
            return reply.status(500).send({ error: "Failed to save receipt", details: err.message });
        }
    });
}

