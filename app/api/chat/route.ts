import { NextRequest, NextResponse } from 'next/server';

const STOCK_ANALYSIS_SYSTEM_PROMPT = `You are a professional stock market analyst. You provide clear, concise, and actionable advice.

CRITICAL RULES:
1. NEVER make up stock prices or data
2. ONLY use the real-time data provided in the conversation
3. If you see "REAL-TIME STOCK DATA" in the messages, use ONLY those exact numbers
4. Answer in 2-3 short paragraphs maximum
5. Be direct and specific with price recommendations
6. Answer in Thai when user asks in Thai

When asked about buying/selling:
- Give specific price targets (e.g., "ซื้อที่ $175-180")
- Provide clear reasoning in 1-2 sentences
- Mention key support/resistance levels
- Keep it short and actionable

Example good response:
"จากราคาปัจจุบัน $185 แนะนำรอซื้อที่ระดับ $175-180 ซึ่งเป็นแนวรับที่แข็งแกร่ง ตั้ง stop loss ที่ $170 และเป้าหมายที่ $200"

DO NOT:
- Write long explanations covering all 9 areas
- Make up fake prices
- Say you cannot provide recommendations
- Use section headers unless necessary
- Write more than 3 paragraphs`;

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();

    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.error('GROQ_API_KEY is not set');
      return NextResponse.json(
        { error: 'GROQ API key not configured' },
        { status: 500 }
      );
    }

    // Extract stock symbol from user's message
    const lastUserMessage = messages[messages.length - 1];
    const stockSymbolMatch = lastUserMessage?.content?.match(/\b([A-Z]{2,5})\b/);
    
    let enhancedMessages = [...messages];
    
    if (stockSymbolMatch) {
      const symbol = stockSymbolMatch[1];
      try {
        const stockResponse = await fetch(`${req.nextUrl.origin}/api/stock?symbol=${symbol}&type=quote`);
        if (stockResponse.ok) {
          const stockData = await stockResponse.json();
          console.log('Fetched stock data for', symbol, ':', stockData);
          
          // Add stock data as a system message
          enhancedMessages = [
            ...messages.slice(0, -1),
            {
              role: 'system',
              content: `REAL-TIME STOCK DATA FOR ${stockData.symbol}:
Current Price: $${stockData.currentPrice}
Previous Close: $${stockData.previousClose}
Day High: $${stockData.dayHigh}
Day Low: $${stockData.dayLow}
52-Week High: $${stockData.fiftyTwoWeekHigh}
52-Week Low: $${stockData.fiftyTwoWeekLow}
Volume: ${stockData.volume}
Market Cap: $${stockData.marketCap}

YOU MUST USE THESE EXACT PRICES IN YOUR RESPONSE. DO NOT MAKE UP ANY NUMBERS.`
            },
            messages[messages.length - 1]
          ];
        }
      } catch (error) {
        console.error('Failed to fetch stock data:', error);
      }
    }

    const systemMessage = {
      role: 'system',
      content: STOCK_ANALYSIS_SYSTEM_PROMPT
    };

    console.log('Calling GROQ API with model:', model || 'llama-3.3-70b-versatile');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'llama-3.3-70b-versatile',
        messages: [systemMessage, ...enhancedMessages],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('GROQ API Error Response:', error);
      return NextResponse.json(
        { error: 'Failed to get response from AI', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    const message = data.choices[0]?.message?.content || 'No response';

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
