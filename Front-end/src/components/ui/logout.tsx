"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/useUserStore";
import { useRouter } from "next/router";
import { useLogout } from "@/hooks/receipts";



export default function LogoutButton() {
  const { clearUser } = useUserStore();
  const router = useRouter();

  const { mutate: logout, isPending } = useLogout();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        clearUser(); // Clear Zustand + localStorage
        router.push("/login"); // ✅ Only after cookie is cleared
      },
      onError: (err) => {
        console.error("Logout failed", err);
      },
    });
  };

  return (
    <Button
      variant="destructive"
      className="flex items-center gap-2"
      onClick={handleLogout}
      disabled={isPending}
    >
      <LogOut className="w-4 h-4" />
      Logout
    </Button>
  );
}
