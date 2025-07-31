// utils/withAuthProtection.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useUserStore } from "@/store/useUserStore";

const publicRoutes = ["/login", "/register", "/forgot-password"];

export function withAuthProtection(Component: React.ComponentType<any>) {
  return function ProtectedComponent(props: any) {
    const router = useRouter();
    const { user, _hasHydrated } = useUserStore();

    useEffect(() => {
      const isPublic = publicRoutes.includes(router.pathname);

      // If it's a public route (like /login) AND user is authenticated AND store has hydrated,
      // then redirect AWAY from the public route to the main page.
      if (isPublic && user && _hasHydrated) {
        router.push("/");
        return; // Prevent further execution
      }

      if (!isPublic) {
        // If it's a protected route
        if (!_hasHydrated) {
          // If store hasn't hydrated yet, do nothing (wait for hydration)
          return;
        }

        // If store has hydrated and user is null, redirect to login
        if (!user) {
          router.push("/login");
        }
      }
    }, [router.pathname, user, _hasHydrated, router]);

    // Show loading state while hydrating on protected routes
    if (!publicRoutes.includes(router.pathname) && !user && !_hasHydrated) {
      return <div>Loading...</div>;
    }

    return <Component {...props} />;
  };
}
