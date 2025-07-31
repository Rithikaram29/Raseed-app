import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Calendar,
  Upload,
  Download,
  Search,
  Filter,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import {
  mockSpendingData,
  mockCategoryData,
  mockRecentReceipts,
} from "@/lib/mockData";
import TopNavbar from "@/components/TopNavbar";

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState("30days");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#FFC658",
  ];

  const totalSpending = mockSpendingData.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const categorySpending = mockCategoryData.filter(
    (cat) => selectedCategory === "all" || cat.name === selectedCategory,
  );

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <main className="fade-in-slide-up">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Overview of your receipt management and spending analytics
            </p>
          </div>

          {/* Time Range and Category Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-6">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-48 h-12">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full sm:w-48 h-12">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Groceries">Groceries</SelectItem>
                <SelectItem value="Transport">Transport</SelectItem>
                <SelectItem value="Utilities">Utilities</SelectItem>
                <SelectItem value="Entertainment">Entertainment</SelectItem>
                <SelectItem value="Food">Food & Dining</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="hover:shadow-lg transition-shadow duration-200 bg-card text-foreground">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Spending
                </CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  ${totalSpending.toLocaleString()}
                </div>
                <p className="text-xs text-green-600 mt-1">
                  +12.5% from last month
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 bg-card text-foreground">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total Receipts
                </CardTitle>
                <Receipt className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  247
                </div>
                <p className="text-xs text-blue-600 mt-1">+8 this week</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 bg-card text-foreground">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Average Receipt
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  ${(totalSpending / mockRecentReceipts.length).toFixed(2)}
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  -2.3% from last month
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 bg-card text-foreground">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Pending Review
                </CardTitle>
                <Calendar className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="text-xl sm:text-2xl font-bold text-foreground">
                  5
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  Needs categorization
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="hover:shadow-lg transition-shadow duration-200 bg-card text-foreground">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-semibold">
                  Spending by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categorySpending}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        name && percent !== undefined
                          ? `${name} ${(percent * 100).toFixed(0)}%`
                          : ""
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {categorySpending.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 bg-card text-foreground">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-semibold">
                  Monthly Spending Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={mockSpendingData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value, name, props) => [`${value}`, name]} />
                    <Legend />
                    <Bar dataKey="amount" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Receipts */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base sm:text-lg font-semibold">
                Recent Receipts
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/receipts")}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecentReceipts.slice(0, 5).map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-3 bg-card rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate text-sm sm:text-base">
                          {receipt.vendor}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {receipt.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-foreground text-sm sm:text-base">
                        ${receipt.amount.toFixed(2)}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {receipt.category}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 sm:mt-8">
            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer bg-card text-foreground">
              <CardContent className="p-4 sm:p-6 text-center">
                <Upload className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">
                  Upload Receipt
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Add a new receipt with AI extraction
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer bg-card text-foreground">
              <CardContent className="p-4 sm:p-6 text-center">
                <Search className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">
                  Search Receipts
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Find and manage your receipts
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer sm:col-span-2 lg:col-span-1 bg-card text-foreground">
              <CardContent className="p-4 sm:p-6 text-center">
                <Download className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">
                  Bulk Download
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Download multiple receipts
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
