// pages/_app.tsx
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import type { NextPage } from "next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { withAuthProtection } from "@/utils/withAuthProtection";
import { ThemeProvider } from "@/components/ThemeProvider";

const queryClient = new QueryClient();

type NextPageWithLayout = NextPage & {
  getLayout?: (page: React.ReactNode) => React.ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page) => <Layout>{page}</Layout>);

  const ProtectedComponent = withAuthProtection(Component);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        {getLayout(<ProtectedComponent {...pageProps} />)}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
