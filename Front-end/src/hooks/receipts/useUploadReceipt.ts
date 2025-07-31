// hooks/useUploadReceipt.ts
import { useMutation } from "@tanstack/react-query";

export const useUploadReceipt = () => {
  return useMutation({
    mutationFn: async ({
      file,
      userId,
    }: {
      file: File;
      userId: string
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      
      console.log("Uploading receipt...",formData);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload-extract`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      return res.json(); // parsed server response
    },
  });
};
