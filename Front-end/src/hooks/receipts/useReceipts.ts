import { useQuery } from "@tanstack/react-query";
import axios from "@/lib/axios";

// 🧠 This hook fetches all receipts from the backend
export const useReceipts = () => {
    return useQuery({
        queryKey: ["receipts"], // 🔑 Used for caching & refetching
        queryFn: async () => {
            const response = await axios.get("/receipts"); // 🔁 Hitting backend route
            return response.data; // ✅ Only return useful data
        },
    });
};
