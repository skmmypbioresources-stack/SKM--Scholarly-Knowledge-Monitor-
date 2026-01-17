

import React, { useState, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Student, ChatMessage, Curriculum } from '../types';
import { updateStudent, checkAndIncrementAiUsage } from '../services/storageService';
import { createChatSession, sendMessageToGemini } from '../services/geminiService';
import { Chat } from '@google/genai';
import { Send, Bot, User, Loader2, Zap } from 'lucide-react';

const Communication: React.FC = () => {
  const { student, refreshStudent } = useOutletContext<{ student: Student, refreshStudent: () => Promise<void> }>();
  
  // Initialize messages from persisted history OR default welcome message
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
      if (student.chatHistory && student.chatHistory.length > 0) {
          return student.chatHistory;
      }
      return [{ 
        id: 'init', 
        role: 'model', 
        text: `Hello ${student.name}! I'm your ${student.curriculum} tutor. How can I help you with your studies today?`, 
        timestamp: Date.now() 
      }];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Quota State
  const DAILY_LIMIT = 15;
  const currentUsageCount = (student.aiUsage?.date === new Date().toISOString().split('T')[0]) ? student.aiUsage?.count || 0 : 0;
  const [remainingQuota, setRemainingQuota] = useState(DAILY_LIMIT - currentUsageCount);
  
  const chatSessionRef = useRef<Chat | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatSessionRef.current) {
        chatSessionRef.current = createChatSession(student.curriculum, student.name);
    }
    // Sync quota on mount/update
    const usage = (student.aiUsage?.date === new Date().toISOString().split('T')[0]) ? student.aiUsage?.count || 0 : 0;
    setRemainingQuota(DAILY_LIMIT - usage);
  }, [student.curriculum, student.name, student.aiUsage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current || isLoading) return;

    // 1. Check Limit BEFORE sending
    if (remainingQuota <= 0) {
        alert("Daily AI Limit Reached. You have used your 15 messages for today. Please try again tomorrow.");
        return;
    }

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: input,
        timestamp: Date.now()
    };

    // Optimistic Update UI
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    // 2. Consume Quota & Save
    const { allowed, remaining } = await checkAndIncrementAiUsage(student);
    if (!allowed) {
        setIsLoading(false);
        setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'model', 
            text: "Daily limit reached. Message not sent.", 
            timestamp: Date.now() 
        }]);
        setRemainingQuota(0);
        return; 
    }
    
    // Update local state immediately
    setRemainingQuota(remaining);

    // Save User Message to DB (Syncs student object too)
    await updateStudent({ ...student, chatHistory: updatedMessages }); // This might be slightly stale on usage, so we refresh after

    // 3. Call AI
    const responseText = await sendMessageToGemini(chatSessionRef.current, userMsg.text);

    const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
    };

    const finalMessages = [...updatedMessages, modelMsg];
    setMessages(finalMessages);
    setIsLoading(false);

    // Save Bot Response to DB
    await updateStudent({ ...student, chatHistory: finalMessages });
    await refreshStudent(); // Sync everything (including Usage count)
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  const isIGCSE = student.curriculum === Curriculum.IGCSE;
  const headerBg = isIGCSE ? 'bg-blue-50/80 border-blue-100' : 'bg-green-50/80 border-green-100';
  const iconBg = isIGCSE ? 'text-blue-600' : 'text-green-600';
  const userBubble = isIGCSE ? 'bg-blue-600' : 'bg-green-600';
  const buttonBg = isIGCSE ? 'bg-blue-600 hover:bg-blue-700 disabled:hover:bg-blue-600' : 'bg-green-600 hover:bg-green-700 disabled:hover:bg-green-600';
  const loadingText = isIGCSE ? 'text-blue-500' : 'text-green-500';
  const ringFocus = isIGCSE ? 'focus:ring-blue-500' : 'focus:ring-green-500';

  return (
    <div className={`h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] flex flex-col bg-white rounded-3xl shadow-lg border ${isIGCSE ? 'border-blue-100' : 'border-green-100'} overflow-hidden`}>
      <div className={`p-5 ${headerBg} border-b flex items-center justify-between backdrop-blur-sm`}>
        <div className="flex items-center gap-4">
            <div className={`p-3 bg-white rounded-full ${iconBg} shadow-sm`}>
                <Bot size={28} />
            </div>
            <div>
                <h2 className="font-bold text-xl text-gray-800">AI Tutor Support</h2>
                <p className="text-sm text-gray-500 flex items-center gap-2 font-medium">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                    Online • {student.curriculum} Specialist
                </p>
            </div>
        </div>
        {/* Quota Display */}
        <div className={`px-4 py-2 rounded-xl border font-bold text-sm flex items-center gap-2 ${remainingQuota > 0 ? 'bg-white border-gray-200 text-gray-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
            <Zap size={16} className={remainingQuota > 0 ? 'text-amber-500 fill-amber-500' : 'text-gray-300'} />
            {remainingQuota > 0 ? `${remainingQuota} Daily Credits Left` : 'Daily Limit Reached'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${isUser ? `${userBubble} text-white` : `bg-white ${iconBg}`}`}>
                            {isUser ? <User size={20} /> : <Bot size={20} />}
                        </div>
                        <div className={`p-5 rounded-3xl shadow-sm text-lg leading-relaxed whitespace-pre-wrap ${
                            isUser 
                            ? `${userBubble} text-white rounded-tr-none` 
                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                </div>
            );
        })}
        {isLoading && (
            <div className="flex justify-start">
                 <div className="flex gap-3 max-w-[80%]">
                    <div className={`w-10 h-10 rounded-full bg-white ${iconBg} border border-gray-100 flex items-center justify-center`}>
                        <Bot size={20} />
                    </div>
                    <div className="bg-white border border-gray-100 p-5 rounded-3xl rounded-tl-none flex items-center gap-3 text-gray-500 text-lg shadow-sm">
                        <Loader2 className={`animate-spin ${loadingText}`} size={20} />
                        Thinking...
                    </div>
                </div>
            </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-5 bg-white border-t border-gray-100">
        {remainingQuota > 0 ? (
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question regarding your curriculum..."
                    className={`w-full bg-gray-100 text-gray-900 placeholder-gray-500 border-0 rounded-full py-4 pl-6 pr-14 text-lg focus:ring-4 ${ringFocus} focus:bg-white transition-all`}
                    disabled={isLoading}
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className={`absolute right-2 p-3 ${buttonBg} text-white rounded-full disabled:opacity-50 transition-all shadow-sm`}
                >
                    <Send size={20} />
                </button>
            </div>
        ) : (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center text-gray-500 font-medium flex items-center justify-center gap-2">
                <Zap size={20} className="text-gray-400" />
                Daily AI Limit Reached. Please come back tomorrow!
            </div>
        )}
        <div className="text-center mt-3">
            <p className="text-xs text-gray-400 font-medium">AI can make mistakes. Check important info.</p>
        </div>
      </div>
    </div>
  );
};

export default Communication;
