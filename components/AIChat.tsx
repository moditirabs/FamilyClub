
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { sendMessageToAssistant } from '../services/geminiService';
import { ChatMessage, FinancialMember, Transaction, BudgetTransaction } from '../types';
import { Send, MapPin, Globe, User, Bot, Loader2, Sparkles, TrendingUp, Calendar, Wallet } from 'lucide-react';

interface AIChatProps {
  financeData: {
    totalCollected: number;
    totalArrears: number;
    activeMembers: number;
    collectionRate: number;
    transactions: Transaction[];
    members: FinancialMember[];
  };
  nextMeeting: string;
  budgetTransactions: BudgetTransaction[];
}

export const AIChat: React.FC<AIChatProps> = ({ financeData, nextMeeting, budgetTransactions }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tool, setTool] = useState<'none' | 'search' | 'maps'>('none');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Dynamic System Instruction Context ---
  const systemInstruction = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Budget Calculations
    const budgetIncome = budgetTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const budgetExpenses = budgetTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const budgetSavings = budgetIncome - budgetExpenses;

    // Identify Unpaid Members for Current Month
    // (Simplistic logic: anyone who hasn't made a transaction with date matching current month)
    const paidMemberIds = new Set(
        financeData.transactions
            .filter(t => (t.timestamp || t.date).startsWith(currentMonth))
            .map(t => t.memberId)
    );
    const unpaidMembers = financeData.members
        .filter(m => !paidMemberIds.has(m.id))
        .map(m => m.name)
        .slice(0, 10); // Limit to top 10 to save context window

    return `
      You are the intelligent assistant for Karara Family Club.
      You have access to the club's live data. Use it to answer questions accurately.

      **CURRENT CLUB DATA:**
      
      **1. Meeting Details:**
      Next Meeting Info: "${nextMeeting}"
      (If asked for directions, use the Google Maps tool with the venue name).

      **2. Financial Dashboard (General):**
      - Total Collected (All Time): R${financeData.totalCollected}
      - Total Arrears: R${financeData.totalArrears}
      - Active Members: ${financeData.activeMembers}
      - Collection Rate: ${financeData.collectionRate}%

      **3. Budget Tracker:**
      - Total Income: R${budgetIncome}
      - Total Expenses: R${budgetExpenses}
      - Current Balance/Savings: R${budgetSavings}

      **4. Member Insights (Current Month: ${currentMonth}):**
      - Number of members who PAID this month: ${paidMemberIds.size}
      - Members who haven't paid this month (Sample): ${unpaidMembers.join(', ')} ${unpaidMembers.length < (financeData.members.length - paidMemberIds.size) ? '...and others' : ''}.

      **GUIDELINES:**
      - When answering about "Next Meeting", format it clearly with Date, Time, Venue.
      - When answering about "Finances", give the exact numbers.
      - If asked general questions (e.g., "Recipe for cake"), answer normally using your general knowledge.
      - Be helpful, polite, and professional.
      - If data is missing or 0, explain that no data has been recorded yet.
    `;
  }, [financeData, nextMeeting, budgetTransactions]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Get location if maps tool is selected or if query implies location (simple heuristic)
      let location = undefined;
      const needsLocation = tool === 'maps' || textToSend.toLowerCase().includes('direction') || textToSend.toLowerCase().includes('where is');
      
      if (needsLocation) {
        try {
            const pos: GeolocationPosition = await new Promise((resolve, reject) => 
                navigator.geolocation.getCurrentPosition(resolve, reject)
            );
            location = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude
            };
        } catch (e) {
            console.warn("Could not get location, proceeding without it.");
        }
      }

      // Prepare history for API
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // Pass the dynamic systemInstruction
      const response = await sendMessageToAssistant(history, userMsg.text, tool === 'none' && needsLocation ? 'maps' : tool, location, systemInstruction);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "I couldn't generate a response based on the available data.",
        timestamp: new Date(),
        groundingMetadata: response.groundingMetadata
      };

      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Sorry, I encountered an error connecting to the AI service.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const QuickAction = ({ icon: Icon, label, query }: { icon: any, label: string, query: string }) => (
    <button 
        onClick={() => handleSend(query)}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition disabled:opacity-50 whitespace-nowrap"
    >
        <Icon className="w-3 h-3" />
        {label}
    </button>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            Club Assistant <span className="text-xs font-normal px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3"/> Connected to Data</span>
        </h3>
        <div className="flex gap-2 text-xs">
            <button 
                onClick={() => setTool('none')}
                className={`px-3 py-1 rounded-full border transition ${tool === 'none' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600'}`}
            >
                Chat
            </button>
            <button 
                onClick={() => setTool('search')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full border transition ${tool === 'search' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600'}`}
            >
                <Globe className="w-3 h-3" /> Search
            </button>
            <button 
                onClick={() => setTool('maps')}
                className={`flex items-center gap-1 px-3 py-1 rounded-full border transition ${tool === 'maps' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600'}`}
            >
                <MapPin className="w-3 h-3" /> Maps
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="bg-white p-4 rounded-full shadow-sm mb-2">
                    <Bot className="w-12 h-12 text-blue-200" />
                </div>
                <p>I can help you with club data, schedules, or general questions.</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                    <QuickAction icon={Calendar} label="Next Meeting?" query="When and where is the next meeting?" />
                    <QuickAction icon={TrendingUp} label="Financial Status" query="What is our current financial status and total collected?" />
                    <QuickAction icon={Wallet} label="Budget Check" query="What is our current budget balance and savings?" />
                    <QuickAction icon={User} label="Who hasn't paid?" query="Who has not paid contributions this month?" />
                </div>
            </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
            }`}>
              <div className="flex items-center gap-2 mb-1 opacity-70 text-xs">
                {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                <span>{msg.role === 'user' ? 'You' : 'Assistant'}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
              
              {/* Grounding Sources */}
              {msg.groundingMetadata && (
                  <div className="mt-3 pt-3 border-t border-slate-100/20 space-y-2">
                      {msg.groundingMetadata.search && msg.groundingMetadata.search.length > 0 && (
                          <div className="text-xs">
                              <span className="font-semibold block mb-1 opacity-80 flex items-center gap-1"><Globe className="w-3 h-3"/> Sources:</span>
                              <div className="flex flex-wrap gap-2">
                                {msg.groundingMetadata.search.map((link, idx) => (
                                    <a key={idx} href={link.uri} target="_blank" rel="noreferrer" className="bg-black/10 hover:bg-black/20 px-2 py-1 rounded truncate max-w-[200px] inline-block transition">
                                        {link.title}
                                    </a>
                                ))}
                              </div>
                          </div>
                      )}
                      {msg.groundingMetadata.maps && msg.groundingMetadata.maps.length > 0 && (
                          <div className="text-xs">
                              <span className="font-semibold block mb-1 opacity-80 flex items-center gap-1"><MapPin className="w-3 h-3"/> Locations:</span>
                               <div className="flex flex-wrap gap-2">
                                {msg.groundingMetadata.maps.map((link, idx) => (
                                    <a key={idx} href={link.uri} target="_blank" rel="noreferrer" className="bg-green-500/10 text-green-700 hover:bg-green-500/20 px-2 py-1 rounded truncate max-w-[200px] inline-block transition border border-green-200">
                                        {link.title}
                                    </a>
                                ))}
                              </div>
                          </div>
                      )}
                  </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-slate-500">Thinking...</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        {messages.length > 0 && (
             <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                <QuickAction icon={Calendar} label="Next Meeting" query="When is the next meeting?" />
                <QuickAction icon={TrendingUp} label="Finances" query="Financial status summary" />
                <QuickAction icon={User} label="Arrears" query="Who is in arrears?" />
             </div>
        )}
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tool === 'maps' ? "Find a venue near me..." : "Ask about finances, meetings, or general topics..."}
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border-slate-200 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
