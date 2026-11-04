'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { Entry } from '@/lib/types';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  sources?: Entry[];
  safetyNotes?: string[];
  isUnanswered?: boolean;
}

export default function AskAiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<'employee' | 'industry'>('employee');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const starterQuestions = [
    'Why is Lathe #3 vibrating after 2 hours?',
    'What should I check before starting Industrial Boiler #1?',
    'Hydraulic Press #2 morning pressure sluggishness fix',
    'How do I eliminate harmonic chatter on thin brass bushings?',
  ];

  useEffect(() => {
    fetchSessionRole();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function fetchSessionRole() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.session) {
        setUserRole(data.session.role);
      }
    } catch {
      // ignore
    }
  }

  function handleNewChat() {
    setMessages([]);
    setInputQuestion('');
    setExpandedSourceId(null);
  }

  async function handleSend(questionText?: string) {
    const q = (questionText || inputQuestion).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.error || 'A temporary server error occurred. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      const isUnanswered = data.answer.includes(
        'No record found. This question has been logged for an expert.'
      );

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || [],
        safetyNotes: data.safetyNotes || [],
        isUnanswered,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: 'Failed to communicate with factory knowledge backend.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-7rem)] justify-between">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold mb-1 ${
              userRole === 'industry'
                ? 'bg-rose-50 text-rose-800'
                : 'bg-emerald-50 text-emerald-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Grounded Factory AI Assistant</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Ask Anubhav
          </h1>
          <p className="text-xs text-slate-500">
            Strictly answers from approved shopfloor records and official equipment specs.
          </p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleNewChat}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.length === 0 ? (
          /* Empty State with Suggested Starter Questions */
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-soft ${
                userRole === 'industry'
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <Bot className="w-8 h-8" />
            </div>

            <h3 className="font-display text-xl font-bold text-slate-800 mb-1">
              Zero-Guesswork Factory Wisdom
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-8">
              Ask about unusual machine acoustics, thermal drift, troubleshooting procedures, or safety checklists.
            </p>

            {/* Suggested Question Chips */}
            <div className="w-full max-w-lg space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Suggested Starter Queries:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {starterQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="p-3 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-soft text-xs text-slate-700 font-medium transition-all group flex flex-col justify-between"
                  >
                    <span>{q}</span>
                    <span
                      className={`text-[10px] font-semibold mt-2 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 ${
                        userRole === 'industry' ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      Ask this query →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Chat Message Feed */
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai' && (
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    userRole === 'industry'
                      ? 'bg-rose-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-3xl p-5 shadow-soft space-y-3 ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white rounded-br-none'
                    : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-none'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-bold">
                    {msg.sender === 'user' ? 'You' : 'Anubhav AI'}
                  </span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Primary Text Content */}
                <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                  {msg.text}
                </div>

                {/* Unanswered Log Notice */}
                {msg.isUnanswered && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Logged in <strong>unanswered questions</strong>. Plant administrators will task a senior specialist to record this knowledge.
                    </span>
                  </div>
                )}

                {/* Bold Red-Bordered Safety Notes Box */}
                {msg.safetyNotes && msg.safetyNotes.length > 0 && (
                  <div className="p-4 rounded-2xl bg-red-50/90 border-2 border-red-300 text-red-900 space-y-1.5 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-xs text-red-950">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      <span>MANDATORY SAFETY PROTOCOL & PPE NOTICE:</span>
                    </div>
                    {msg.safetyNotes.map((sn, idx) => (
                      <p key={idx} className="text-xs font-semibold pl-6">
                        • {sn}
                      </p>
                    ))}
                  </div>
                )}

                {/* Cited Sources Cards */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Cited Institutional Sources ({msg.sources.length}):</span>
                    </div>

                    <div className="space-y-1.5">
                      {msg.sources.map((src) => {
                        const isExpanded = expandedSourceId === src.id;
                        const isPending = src.status === 'pending';

                        return (
                          <div
                            key={src.id}
                            className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3 text-xs transition-all"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-bold text-slate-800 truncate">
                                  {src.title}
                                </span>

                                {isPending ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                    Unverified
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                    Approved
                                  </span>
                                )}

                                <span className="text-[11px] text-slate-400 hidden sm:inline">
                                  • {src.machine?.name || 'General'}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedSourceId(isExpanded ? null : src.id)
                                }
                                className="text-slate-400 hover:text-slate-700 p-1 shrink-0"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            {/* Expanded Source Details */}
                            {isExpanded && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 text-xs text-slate-600 space-y-1.5 animate-in fade-in duration-100">
                                <p className="leading-relaxed">{src.content_text}</p>
                                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                                  <span>
                                    Author:{' '}
                                    <strong>
                                      {src.employee?.full_name || src.author_name_cache || 'Technician'}
                                    </strong>
                                  </span>
                                  <span>
                                    Record ID: <span className="font-mono">{src.id.slice(0, 8)}...</span>
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 justify-start items-center">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                userRole === 'industry' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-soft flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Consulting factory records & equipment specs...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form at Bottom */}
      <div className="pt-3 border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Ask about machine symptoms, exceptions, or operating quirks..."
            disabled={loading}
            className="w-full pl-5 pr-28 py-3.5 rounded-3xl border border-slate-200/90 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white shadow-soft"
          />

          <button
            type="submit"
            disabled={!inputQuestion.trim() || loading}
            className={`absolute right-2 px-4 py-2 rounded-2xl text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
              !inputQuestion.trim() || loading
                ? 'opacity-40 cursor-not-allowed bg-slate-400'
                : userRole === 'industry'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400 mt-2">
          Strict Zero-Hallucination Policy: Answers are derived exclusively from verified shopfloor records.
        </p>
      </div>
    </div>
  );
}

