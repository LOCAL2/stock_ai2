'use client';

import { useState, useRef, useEffect } from 'react';
import StockChart from './components/StockChart';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Model {
  id: string;
  name: string;
  params: string;
}

const models: Model[] = [
  { id: 'llama-3.3-70b-versatile', name: 'Stock Model', params: '10M' },
];

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel] = useState<Model>(models[0]);
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [showChart, setShowChart] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isLoading) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const stockSymbolMatch = input.match(/\b([A-Z]{1,5})\b/);
    if (stockSymbolMatch) {
      setSelectedStock(stockSymbolMatch[1]);
      setShowChart(true);
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          model: selectedModel.id 
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, an error occurred. Please try again.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen bg-white text-black" suppressHydrationWarning>
      <header className="border-b border-gray-200 px-6 py-4" suppressHydrationWarning>
        <div className="flex items-center justify-between max-w-4xl mx-auto" suppressHydrationWarning>
          <div suppressHydrationWarning>
            <h1 className="text-2xl font-bold">AI Stock Analyst</h1>
          </div>
          
          <div className="flex items-center gap-4" suppressHydrationWarning>
            <button
              onClick={clearChat}
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Clear Chat
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-8" suppressHydrationWarning>
        <div className="max-w-4xl mx-auto space-y-6" suppressHydrationWarning>
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20" suppressHydrationWarning>
              <p className="text-lg font-medium mb-4">AI Stock Market Analyst</p>
              <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto text-xs" suppressHydrationWarning>
                <div className="bg-gray-50 p-3 rounded-lg" suppressHydrationWarning>Finance</div>
                <div className="bg-gray-50 p-3 rounded-lg" suppressHydrationWarning>Technical Analysis</div>
                <div className="bg-gray-50 p-3 rounded-lg" suppressHydrationWarning>Statistics/Quant</div>
                <div className="bg-gray-50 p-3 rounded-lg" suppressHydrationWarning>Market Microstructure</div>
                <div className="bg-gray-50 p-3 rounded-lg" suppressHydrationWarning>Behavioral Finance</div>
                <div className="bg-gray-50 p-3 rounded-lg" suppressHydrationWarning>Macroeconomics</div>
                <div className="bg-gray-50 p-3 rounded-lg" suppressHydrationWarning>Risk Management</div>
                <div className="bg-gray-50 p-3 rounded-lg" suppressHydrationWarning>Data Engineering</div>
                <div className="bg-gray-50 p-3 rounded-lg" suppressHydrationWarning>Backtesting</div>
              </div>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div key={index} suppressHydrationWarning>
              <div
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                suppressHydrationWarning
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                    message.role === 'user'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-black'
                  }`}
                  suppressHydrationWarning
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              </div>
              
              {message.role === 'user' && showChart && selectedStock && index === messages.findLastIndex(m => m.role === 'user') && (
                <div className="mt-6">
                  <StockChart symbol={selectedStock} />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start" suppressHydrationWarning>
              <div className="bg-gray-100 rounded-2xl px-6 py-4" suppressHydrationWarning>
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-sm text-gray-500">AI กำลังวิเคราะห์...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} suppressHydrationWarning />
        </div>
      </div>

      <div className="border-t border-gray-200 px-6 py-4" suppressHydrationWarning>
        <div className="max-w-4xl mx-auto" suppressHydrationWarning>
          <div className="flex gap-3" suppressHydrationWarning>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="ถามเกี่ยวกับหุ้น (เช่น AAPL, TSLA, NVDA)..."
              className="flex-1 px-6 py-4 border border-gray-300 rounded-xl focus:outline-none focus:border-black transition-colors"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="px-8 py-4 bg-black text-white rounded-xl hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
