import { useMutation } from "@tanstack/react-query";
import axios from "@/lib/axios";

const BASE_URL = process.env.VITE_BASE_URL ?? "http://localhost:5001/api";

export const useCreateQuery = () =>
  useMutation({
    mutationFn: async (data: { text: string; timestamp: string; confidence?: number }) => {
      const res = await axios.post(`${BASE_URL}/user-queries`, data);
      return res.data;
    },
  });