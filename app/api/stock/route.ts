import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const range = searchParams.get('range') || '1mo';
    const interval = searchParams.get('interval') || '1d';
    const type = searchParams.get('type') || 'chart';

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // If requesting quote data
    if (type === 'quote') {
      const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d`;
      const response = await fetchWithRetry(quoteUrl);

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch quote data' },
          { status: response.status }
        );
      }

      const data = await response.json();
      const result = data.chart?.result?.[0];

      if (!result) {
        return NextResponse.json(
          { error: 'Invalid stock symbol' },
          { status: 404 }
        );
      }

      const meta = result.meta;
      const quote = {
        symbol: meta.symbol,
        currentPrice: meta.regularMarketPrice,
        previousClose: meta.previousClose || meta.chartPreviousClose,
        open: meta.regularMarketOpen,
        dayHigh: meta.regularMarketDayHigh,
        dayLow: meta.regularMarketDayLow,
        volume: meta.regularMarketVolume,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
        currency: meta.currency,
        marketCap: meta.marketCap,
      };

      return NextResponse.json(quote);
    }

    // Chart data
    const period1 = Math.floor(getStartDate(range).getTime() / 1000);
    const period2 = Math.floor(Date.now() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=${interval}`;

    console.log('Fetching stock data for:', symbol);

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      console.error('Yahoo Finance API error:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch stock data from Yahoo Finance' },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.chart?.error || !data.chart?.result?.[0]) {
      return NextResponse.json(
        { error: 'Invalid stock symbol or no data available' },
        { status: 404 }
      );
    }

    const result = data.chart.result[0];
    const quotes = result.timestamp?.map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString(),
      open: result.indicators?.quote?.[0]?.open?.[index],
      high: result.indicators?.quote?.[0]?.high?.[index],
      low: result.indicators?.quote?.[0]?.low?.[index],
      close: result.indicators?.quote?.[0]?.close?.[index],
      volume: result.indicators?.quote?.[0]?.volume?.[index],
    })) || [];

    console.log('Successfully fetched', quotes.length, 'data points for', symbol);

    return NextResponse.json({
      symbol: result.meta.symbol,
      currency: result.meta.currency,
      currentPrice: result.meta.regularMarketPrice,
      previousClose: result.meta.chartPreviousClose,
      quotes: quotes,
    });
  } catch (error) {
    console.error('Stock API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock data. Please try again.' },
      { status: 500 }
    );
  }
}

function getStartDate(range: string): Date {
  const now = new Date();
  const date = new Date(now);

  switch (range) {
    case '1d':
      date.setDate(date.getDate() - 1);
      break;
    case '5d':
      date.setDate(date.getDate() - 5);
      break;
    case '1mo':
      date.setMonth(date.getMonth() - 1);
      break;
    case '6mo':
      date.setMonth(date.getMonth() - 6);
      break;
    case '1y':
      date.setFullYear(date.getFullYear() - 1);
      break;
    case '5y':
      date.setFullYear(date.getFullYear() - 5);
      break;
    case 'max':
      date.setFullYear(date.getFullYear() - 20);
      break;
    default:
      date.setMonth(date.getMonth() - 1);
  }

  return date;
}
