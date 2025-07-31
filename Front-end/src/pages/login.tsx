"use client";

import { useRouter } from "next/router";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt } from "lucide-react";
import { useGoogleLogin } from "@/hooks/receipts/useGoogleLogin";
import { useUserStore } from "@/store/useUserStore";
import { getDeviceToken } from "@/lib/getDeviceToken";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);
  const loginMutation = useGoogleLogin();

  const handleGoogleLogin = async (credentialResponse: any) => {
    if (credentialResponse?.credential) {
      const deviceTokens = await getDeviceToken();
      const tokens = deviceTokens ? [deviceTokens] : undefined;
      loginMutation.mutate(
        {
          credential: credentialResponse.credential,
          deviceTokens: tokens,
        },
        {
          onSuccess: (data) => {
            setUser(data.user);
          },
          onError: (err: any) => {
            console.error("Login Failed", err);
          },
        },
      );
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-secondary rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -top-8 right-20 w-72 h-72 bg-accent rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

        {/* Overlay to darken/lighten and add texture */}
        <div className="absolute inset-0 bg-background/60 backdrop-blur-2xl"></div>

        {/* Login Card (z-index to bring it to front) */}
        <Card className="w-full max-w-md bg-card/80 backdrop-blur shadow-xl border z-10">
          <CardHeader className="text-center">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Welcome to Raseed
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in with your Google account
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => console.log("Login Failed")}
              width="100%"
              size="large"
              shape="pill"
              theme="outline"
            />
          </CardContent>
        </Card>
      </div>
    </GoogleOAuthProvider>
  );
}

// Preserve layout
LoginPage.getLayout = (page: React.ReactNode) => page;
