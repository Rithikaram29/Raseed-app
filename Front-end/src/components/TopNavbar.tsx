"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LogoutButton from "./ui/logout";
import { useUserStore } from "@/store/useUserStore";
import { useRouter } from "next/router";
import { useLogout } from "@/hooks/receipts";

export default function TopNavbar() {
  const user = useUserStore((state) => state.user);
  const router = useRouter();

  const handleProfile = () => {
    router.push("/profile");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background shadow-md border-b h-16 flex items-center justify-end px-4 sm:px-6 lg:ml-64">
      <div className="flex items-center gap-4">
        <Avatar className="h-8 w-8">
          <AvatarImage src="/user.png" alt="User" />
          <img
            src={user?.image}
            alt=""
            className="h-8 w-8 rounded-full cursor-pointer"
            onClick={handleProfile}
          />
        </Avatar>
        <LogoutButton />
      </div>
    </header>
  );
}
