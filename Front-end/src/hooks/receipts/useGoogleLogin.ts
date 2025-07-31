// src/hooks/useGoogleLoginMutation.ts
import { useMutation } from "@tanstack/react-query";

interface GoogleLoginPayload {
    credential: string;
    deviceTokens?: string[];
}

export const useGoogleLogin = () =>
    useMutation({
        mutationFn: async ({ credential, deviceTokens }: GoogleLoginPayload) => {
            console.log("Login with Google:", { deviceTokens });
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/google`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include", // Send cookies
                body: JSON.stringify({ credential, deviceTokens }),
            });

            if (!res.ok) {
                throw new Error("Login failed");
            }

            return res.json();
        },
    });


export const useLogout = () =>
    useMutation({
        mutationFn: async () => {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/logout`, {
                method: "POST",
                credentials: "include",
            });

            if (!res.ok) {
                throw new Error("Logout failed");
            }

            return res.json();
        },
    });
