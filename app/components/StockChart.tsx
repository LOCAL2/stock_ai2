'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface StockChartProps {
  symbol: string;
}

type TimeRange = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'MAX';

interface ChartData {
  date: string;
  price: number;
}

export default function StockChart({ symbol }: StockChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeRanges: TimeRange[] = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'MAX'];

  const timeRangeLabels: Record<TimeRange, string> = {
    '1D': '1 วัน',
    '5D': '5 วัน',
    '1M': '1 เดือน',
    '6M': '6 เดือน',
    'YTD': 'ปีนี้',
    '1Y': '1 ปี',
    '5Y': '5 ปี',
    'MAX': 'สูงสุด',
  };

  useEffect(() => {
    fetchStockData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStockData();
    }, 30000);

    return () => clearInterval(interval);
  }, [symbol, timeRange]);

  const fetchStockData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const rangeMap: Record<TimeRange, string> = {
        '1D': '1d',
        '5D': '5d',
        '1M': '1mo',
        '6M': '6mo',
        'YTD': '1y',
        '1Y': '1y',
        '5Y': '5y',
        'MAX': 'max',
      };

      const intervalMap: Record<TimeRange, string> = {
        '1D': '5m',
        '5D': '15m',
        '1M': '1d',
        '6M': '1d',
        'YTD': '1d',
        '1Y': '1d',
        '5Y': '1wk',
        'MAX': '1mo',
      };

      const range = rangeMap[timeRange];
      const interval = intervalMap[timeRange];

      const response = await fetch(`/api/stock?symbol=${symbol}&range=${range}&interval=${interval}&t=${Date.now()}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setChartData([]);
        return;
      }

      const processedData = data.quotes
        .filter((quote: any) => quote.close !== null)
        .map((quote: any) => ({
          date: new Date(quote.date).toISOString(),
          price: quote.close,
        }));

      setChartData(processedData);
    } catch (err) {
      setError('Failed to fetch stock data');
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (timeRange === '1D' || timeRange === '5D') {
      return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
  };

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;
  const previousPrice = chartData.length > 1 ? chartData[0].price : currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">{symbol}</h2>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-3xl font-semibold">
              ${currentPrice.toFixed(2)}
            </span>
            <span className={`text-lg ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          อัพเดทอัตโนมัติทุก 30 วินาที
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {timeRanges.map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              timeRange === range
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {timeRangeLabels[range]}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-400">กำลังโหลดกราฟ...</div>
        </div>
      )}

      {error && (
        <div className="h-80 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      )}

      {!isLoading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData}>
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              domain={['auto', 'auto']}
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'ราคา']}
              labelFormatter={formatDate}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={isPositive ? '#16a34a' : '#dc2626'}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {!isLoading && !error && chartData.length === 0 && (
        <div className="h-80 flex items-center justify-center">
          <div className="text-gray-400">ไม่มีข้อมูล</div>
        </div>
      )}
    </div>
  );
}
