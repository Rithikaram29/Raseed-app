'use client';

import {
  ResponsiveContainer,
  LineChart,
  PieChart,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Pie,
  Cell,
  Line,
  Area,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalyticsChartsProps {
  mockSpendingData: Array<{ month: string; amount: number }>;
  mockCategoryData: Array<{ name: string; amount: number }>;
  trendData: Array<{ period: string; current: number; previous: number }>;
  categoryTrends: Array<{ name: string; amount: number; trend: string; change: string }>;
  COLORS: string[];
}

export default function AnalyticsCharts({
  mockSpendingData,
  mockCategoryData,
  trendData,
  categoryTrends,
  COLORS,
}: AnalyticsChartsProps) {
  return (
    <>
      {/* Advanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Spending Trends Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value, name, props) => [`${value}`, name]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Current Period"
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Previous Period"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow duration-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Category Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mockCategoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    name && percent !== undefined ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {mockCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [`${value}`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Spending Pattern Analysis */}
      <Card className="mb-8 hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Monthly Spending Pattern</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={mockSpendingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value, name, props) => [`${value}`, name]} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Trends */}
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Category Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryTrends.map(category => (
              <div
                key={category.name}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: COLORS[categoryTrends.indexOf(category) % COLORS.length],
                    }}
                  ></div>
                  <div>
                    <p className="font-medium text-gray-900">{category.name}</p>
                    <p className="text-sm text-gray-500">${category.amount.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {category.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${category.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {category.change}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
