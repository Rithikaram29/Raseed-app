"use client";
// import { requestPermissionAndGetToken } from "@/lib/firebase";
import { initMessaging } from "@/lib/firebase-client";
import React, { useEffect } from "react";

const test = () => {
  useEffect(() => {
    const initAnalytics = async () => {
      if (typeof window !== "undefined") {
        //   const { getAnalytics } = await import("firebase/analytics");
        //   getAnalytics(app);
        initMessaging();
      }
    };
    initAnalytics();
  }, []);
  return <div>hello</div>;
};

export default test;
