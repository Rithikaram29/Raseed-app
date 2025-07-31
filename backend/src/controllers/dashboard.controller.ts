import { FastifyReply, FastifyRequest } from "fastify";

export const getDashboard = (req: FastifyRequest, res: FastifyReply) => {
  res.send("Dashboard");
};

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { DashboardResponse } from "../types/dashBoardType";
import { db } from "../config/firebase";
// import { db } from './firebase-config'; // Your Firebase config

export interface DashboardParams {
  timeRange: "7d" | "30d" | "90d" | "1y" | "all";
  selectedCategory?: string;
}

export async function getDashboardData(
  userId: string,
  params: DashboardParams
): Promise<DashboardResponse> {
  try {
    const { timeRange, selectedCategory } = params;

    console.log("timeRange", timeRange);
    console.log("selectedCategory", selectedCategory);

    // Calculate date range based on timeRange parameter
    const getDateRange = (range: string) => {
      const now = new Date();
      const startDate = new Date();

      switch (range) {
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(now.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(now.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case "all":
        default:
          startDate.setFullYear(2020); // Far back date
          break;
      }

      return { startDate, endDate: now };
    };

    const { startDate, endDate } = getDateRange(timeRange);

    // Base query for user's receipts with time filter
    const receiptsRef = collection(db, "receipts");
    let userReceiptsQuery = query(
      receiptsRef,
      where("userId", "==", userId),
      //   where("createdAt", ">=", Timestamp.fromDate(startDate)),
      //   where("createdAt", "<=", Timestamp.fromDate(endDate)),
      orderBy("createdAt", "desc")
    );

    const receiptsSnapshot = await getDocs(userReceiptsQuery);
    let receipts: any = receiptsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // console.log("recipts", receipts, startDate, endDate, userId);

    // Filter by category if selectedCategory is provided
    if (selectedCategory && selectedCategory !== "all") {
      receipts = receipts.filter((receipt: any) => {
        if (!receipt.categorization?.categories) return false;
        return Object.keys(receipt.categorization.categories).includes(
          selectedCategory
        );
      });
    }

    // Calculate comparison period for growth metrics
    const getComparisonPeriod = (range: string, currentStart: Date) => {
      const comparisonStart = new Date(currentStart);
      const comparisonEnd = new Date(currentStart);

      switch (range) {
        case "7d":
          comparisonStart.setDate(currentStart.getDate() - 14);
          comparisonEnd.setDate(currentStart.getDate() - 7);
          break;
        case "30d":
          comparisonStart.setDate(currentStart.getDate() - 60);
          comparisonEnd.setDate(currentStart.getDate() - 30);
          break;
        case "90d":
          comparisonStart.setDate(currentStart.getDate() - 180);
          comparisonEnd.setDate(currentStart.getDate() - 90);
          break;
        case "1y":
          comparisonStart.setFullYear(currentStart.getFullYear() - 2);
          comparisonEnd.setFullYear(currentStart.getFullYear() - 1);
          break;
        default:
          // For 'all', compare with previous year or return empty
          comparisonStart.setFullYear(2019);
          comparisonEnd.setFullYear(2020);
      }

      return { comparisonStart, comparisonEnd };
    };

    const { comparisonStart, comparisonEnd } = getComparisonPeriod(
      timeRange,
      startDate
    );

    // Get comparison period data for growth calculation
    const comparisonQuery = query(
      receiptsRef,
      where("userId", "==", userId)
      //   where("createdAt", ">=", Timestamp.fromDate(comparisonStart)),
      //   where("createdAt", "<=", Timestamp.fromDate(comparisonEnd))
    );

    const comparisonSnapshot = await getDocs(comparisonQuery);
    let comparisonReceipts = comparisonSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter comparison receipts by category if needed
    if (selectedCategory && selectedCategory !== "all") {
      comparisonReceipts = comparisonReceipts.filter((receipt: any) => {
        if (!receipt.categorization?.categories) return false;
        return Object.keys(receipt.categorization.categories).includes(
          selectedCategory
        );
      });
    }

    // Calculate metrics
    const totalSpending = receipts.reduce(
      (sum: any, receipt: any) => sum + (receipt.total || 0),
      0
    );
    const totalReceipts = receipts.length;
    const averageReceiptAmount =
      totalReceipts > 0 ? totalSpending / totalReceipts : 0;
    const pendingReceipts = 0;

    // Calculate growth percentages based on comparison period
    const currentPeriodSpending = receipts.reduce(
      (sum: any, receipt: any) => sum + (receipt.total || 0),
      0
    );
    const comparisonPeriodSpending = comparisonReceipts.reduce(
      (sum: any, receipt: any) => sum + (receipt.total || 0),
      0
    );

    const spendingGrowthPercentage =
      comparisonPeriodSpending > 0
        ? ((currentPeriodSpending - comparisonPeriodSpending) /
            comparisonPeriodSpending) *
          100
        : 0;

    const receiptsGrowth =
      comparisonReceipts.length > 0
        ? ((receipts.length - comparisonReceipts.length) /
            comparisonReceipts.length) *
          100
        : 0;

    const currentPeriodAvg =
      receipts.length > 0 ? currentPeriodSpending / receipts.length : 0;
    const comparisonPeriodAvg =
      comparisonReceipts.length > 0
        ? comparisonPeriodSpending / comparisonReceipts.length
        : 0;

    const avgGrowthPercentage =
      comparisonPeriodAvg > 0
        ? ((currentPeriodAvg - comparisonPeriodAvg) / comparisonPeriodAvg) * 100
        : 0;

    // Calculate category breakdown (filter by selectedCategory if provided)
    const categoryMap = new Map<
      string,
      { totalAmount: number; receiptCount: number }
    >();

    receipts.forEach((receipt: any) => {
      if (receipt.categorization?.categories) {
        Object.keys(receipt.categorization.categories).forEach((category) => {
          // If selectedCategory is specified and this isn't it, skip
          if (
            selectedCategory &&
            selectedCategory !== "all" &&
            category !== selectedCategory
          ) {
            return;
          }

          const categoryItems = receipt.categorization.categories[category];
          const categoryTotal = categoryItems.reduce(
            (sum: number, item: any) => sum + (item.total || 0),
            0
          );

          if (categoryMap.has(category)) {
            const existing = categoryMap.get(category)!;
            existing.totalAmount += categoryTotal;
            existing.receiptCount += 1;
          } else {
            categoryMap.set(category, {
              totalAmount: categoryTotal,
              receiptCount: 1,
            });
          }
        });
      }
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        totalAmount: data.totalAmount,
        receiptCount: data.receiptCount,
      })
    );

    // Calculate trend data based on timeRange
    const getTrendInterval = (range: string) => {
      switch (range) {
        case "7d":
          return "daily";
        case "30d":
          return "daily";
        case "90d":
          return "weekly";
        case "1y":
          return "monthly";
        case "all":
          return "monthly";
        default:
          return "monthly";
      }
    };

    const trendInterval = getTrendInterval(timeRange);
    const trendMap = new Map<
      string,
      { totalAmount: number; receiptCount: number }
    >();

    receipts.forEach((receipt: any) => {
      const createdAt =
        receipt.createdAt?.toDate?.() || new Date(receipt.createdAt);
      let trendKey: string;

      switch (trendInterval) {
        case "daily":
          trendKey = createdAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          break;
        case "weekly":
          const weekStart = new Date(createdAt);
          weekStart.setDate(createdAt.getDate() - createdAt.getDay());
          trendKey = `Week of ${weekStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`;
          break;
        case "monthly":
        default:
          trendKey = createdAt.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });
          break;
      }

      if (trendMap.has(trendKey)) {
        const existing = trendMap.get(trendKey)!;
        existing.totalAmount += receipt.total || 0;
        existing.receiptCount += 1;
      } else {
        trendMap.set(trendKey, {
          totalAmount: receipt.total || 0,
          receiptCount: 1,
        });
      }
    });

    const monthlyTrend = Array.from(trendMap.entries())
      .map(([period, data]) => ({
        month: period,
        totalAmount: data.totalAmount,
        receiptCount: data.receiptCount,
      }))
      .sort((a, b) => {
        // Simple date sorting - might need adjustment based on your needs
        return new Date(a.month).getTime() - new Date(b.month).getTime();
      });

    // Get recent receipts (last 10)
    const recentReceipts = receipts.slice(0, 10).map((receipt: any) => ({
      id: receipt.id,
      vendor: receipt.vendor || "Unknown Vendor",
      category:
        Object.keys(receipt.categorization?.categories || {})[0] ||
        "Uncategorized",
      amount: receipt.total || 0,
      date: (
        receipt.createdAt?.toDate?.() || new Date(receipt.createdAt)
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      status:
        receipt.processingStatus === "processed"
          ? ("processed" as const)
          : ("pending" as const),
    }));

    // Get available categories
    const availableCategories = Array.from(
      new Set(categoryBreakdown.map((item) => item.category))
    );

    return {
      metrics: {
        totalSpending: Math.round(totalSpending * 100) / 100,
        totalReceipts,
        averageReceiptAmount: Math.round(averageReceiptAmount * 100) / 100,
        pendingReceipts,
        spendingGrowthPercentage:
          Math.round(spendingGrowthPercentage * 10) / 10,
        receiptsGrowth: Math.round(receiptsGrowth),
        avgGrowthPercentage: Math.round(avgGrowthPercentage * 10) / 10,
      },
      categoryBreakdown,
      monthlyTrend,
      recentReceipts,
      availableCategories,
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
}
