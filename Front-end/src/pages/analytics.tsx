import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from 'recharts';
import { DollarSign, Receipt, TrendingUp, Calendar, Upload, Download, Search } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { mockSpendingData, mockCategoryData, mockRecentReceipts } from '@/lib/mockData';

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('30days');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

  const totalSpending = mockSpendingData.reduce((sum, item) => sum + item.amount, 0);
  const categorySpending = mockCategoryData.filter(
    cat => selectedCategory === 'all' || cat.name === selectedCategory
  );

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      <main className="fade-in-slide-up">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Analytics</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Deep insights into your spending patterns and trends
            </p>
          </div>

          {/* Filters */}
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

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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

          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <DashboardCard
              title="Average Daily Spend"
              icon={<DollarSign className="h-4 w-4 text-blue-600" />}
              value={`$${totalSpending.toLocaleString()}`}
              note="+12.5% from last month"
              noteColor="text-green-600"
            />
            <DashboardCard
              title="Total Receipts"
              icon={<Receipt className="h-4 w-4 text-green-600" />}
              value="247"
              note="+8 this week"
              noteColor="text-blue-600"
            />
            <DashboardCard
              title="Average Receipt"
              icon={<TrendingUp className="h-4 w-4 text-purple-600" />}
              value={`$${(totalSpending / mockRecentReceipts.length).toFixed(2)}`}
              note="-2.3% from last month"
              noteColor="text-purple-600"
            />
            <DashboardCard
              title="Pending Review"
              icon={<Calendar className="h-4 w-4 text-orange-600" />}
              value="5"
              note="Needs categorization"
              noteColor="text-orange-600"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="hover:shadow-lg bg-card text-foreground">
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
                      outerRadius={80}
                      labelLine={false}
                      label={({ name, percent }) => {
                        if (percent) `${name} ${(percent * 100).toFixed(0)}%`;
                        else return null;
                      }}
                      dataKey="amount"
                    >
                      {categorySpending.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [`${value}`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg bg-card text-foreground">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg font-semibold">
                  Category Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={categorySpending}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value, name, props) => [`${value}`, name]} />
                    <Legend />
                    <Bar dataKey="amount" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 sm:mt-8">
            <QuickActionCard
              icon={<Upload className="h-8 w-8 text-blue-600 mx-auto mb-3" />}
              title="Upload Receipt"
              subtitle="Add a new receipt with AI extraction"
              href="/upload"
            />
            <QuickActionCard
              icon={<Search className="h-8 w-8 text-green-600 mx-auto mb-3" />}
              title="Search Receipts"
              subtitle="Find and manage your receipts"
              href="/receipts"
            />
            <QuickActionCard
              icon={<Download className="h-8 w-8 text-purple-600 mx-auto mb-3" />}
              title="Bulk Download"
              subtitle="Download multiple receipts"
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function DashboardCard({
  title,
  icon,
  value,
  note,
  noteColor,
}: {
  title: string;
  icon: React.ReactNode;
  value: string;
  note: string;
  noteColor: string;
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 bg-card text-foreground">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="text-xl sm:text-2xl font-bold text-foreground">{value}</div>
        <p className={`text-xs mt-1 ${noteColor}`}>{note}</p>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  href?: string;
}) {
  return (
    <Card
      className="hover:shadow-lg transition-shadow duration-200 cursor-pointer bg-card text-foreground"
      onClick={() => href && (window.location.href = href)}
    >
      <CardContent className="p-4 sm:p-6 text-center">
        {icon}
        <h3 className="font-semibold text-foreground mb-2 text-sm sm:text-base">{title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
