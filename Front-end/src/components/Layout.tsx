import React from "react";
import TopNavbar from "./TopNavbar";
import Navigation from "./Navigation";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen text-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <Navigation />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <TopNavbar />

        <main className="flex-1 overflow-y-auto px-4 pt-20 relative fade-in-slide-up">
          {/* Abstract Background Elements for Main Content */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-1000"></div>
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-secondary/20 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-3000"></div>
          <div className="absolute inset-0 bg-background/20 backdrop-blur-md -z-10"></div>
          <div className="relative z-0">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
