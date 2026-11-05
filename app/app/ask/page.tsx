'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  RotateCcw,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  Clock,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertCircle,
} from 'lucide-react';
import { Entry } from '@/lib/types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  sources?: Entry[];
  safetyNotes?: string[];
  isUnanswered?: boolean;
  language?: 'en' | 'ta';
}

export default function AskAiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<'employee' | 'industry'>('employee');
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);

  // Voice recording state
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [tamilVoiceWarning, setTamilVoiceWarning] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSessionRole();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, transcribing]);

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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setMessages([]);
    setInputQuestion('');
    setExpandedSourceId(null);
    setVoiceError(null);
    setTamilVoiceWarning(null);
    setSpeakingMsgId(null);
  }

  // Voice Recording via MediaRecorder
  async function startRecording() {
    setVoiceError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceError('Audio recording is not supported in this browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size === 0) {
          setVoiceError('No audio was captured. Please try speaking again.');
          return;
        }
        await handleTranscribe(audioBlob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setVoiceError('Microphone permission was denied. Please allow microphone access in your browser settings.');
      } else {
        setVoiceError('Unable to access microphone. Please check your audio hardware.');
      }
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  async function handleTranscribe(blob: Blob) {
    setTranscribing(true);
    setVoiceError(null);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'voice.webm');

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setVoiceError(data.error || 'Failed to transcribe speech.');
      } else if (data.transcript && data.transcript.trim()) {
        const transcriptText = data.transcript.trim();
        setInputQuestion(transcriptText);
        handleSend(transcriptText, data.language);
      } else {
        setVoiceError('No speech detected in audio. Please try speaking clearly.');
      }
    } catch {
      setVoiceError('Network error while transcribing audio.');
    } finally {
      setTranscribing(false);
    }
  }

  // Text-To-Speech playback
  function handleSpeak(msgId: string, text: string, langHint?: 'en' | 'ta') {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceError('Speech synthesis is not supported in this browser.');
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingMsgId(msgId);
    setTamilVoiceWarning(null);

    const isTamil = langHint === 'ta' || /[\u0B80-\u0BFF]/.test(text);
    const targetLang = isTamil ? 'ta-IN' : 'en-IN';

    // Strip Markdown symbols for clean speech output
    const cleanSpeech = text
      .replace(/\[Record ID:[^\]]+\]/g, '')
      .replace(/[*#_`]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = targetLang;
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    if (isTamil) {
      const tamilVoice = voices.find((v) => v.lang.startsWith('ta'));
      if (tamilVoice) {
        utterance.voice = tamilVoice;
      } else {
        setTamilVoiceWarning('A native Tamil system voice is not installed. Playback will use the default voice.');
      }
    } else {
      const englishVoice = voices.find(
        (v) => v.lang === 'en-IN' || v.lang === 'en-GB' || v.lang.startsWith('en')
      );
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
    }

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    window.speechSynthesis.speak(utterance);
  }

  async function handleSend(questionText?: string, detectedLang?: 'en' | 'ta') {
    const q = (questionText || inputQuestion).trim();
    if (!q || loading) return;

    const isTamilQuestion = detectedLang === 'ta' || /[\u0B80-\u0BFF]/.test(q);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: isTamilQuestion ? 'ta' : 'en',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setVoiceError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, language: isTamilQuestion ? 'ta' : 'en' }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.error || 'The AI service is unavailable, please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      const isUnanswered =
        data.answer.includes('No record found. This question has been logged for an expert.') ||
        data.answer.includes('எந்தப் பதிவும் கிடைக்கவில்லை');

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || [],
        safetyNotes: data.safetyNotes || [],
        isUnanswered,
        language: data.language || (isTamilQuestion ? 'ta' : 'en'),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: 'The AI service is unavailable, please try again.',
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
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Ask Anubhav
          </h1>
          <p className="text-xs text-slate-500">
            Ask questions in English or Tamil about machine quirks, troubleshooting, or plant procedures.
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

      {/* Voice & System Alerts */}
      {voiceError && (
        <div className="mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{voiceError}</span>
        </div>
      )}

      {tamilVoiceWarning && (
        <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{tamilVoiceWarning}</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.length === 0 ? (
          /* Empty State */
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
              Ask Any Factory Question
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md">
              Type or tap the mic to speak in English or Tamil. Responses are drawn directly from approved plant records.
            </p>
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
                  <div className="flex items-center gap-2">
                    {msg.sender === 'ai' && (
                      <button
                        type="button"
                        onClick={() => handleSpeak(msg.id, msg.text, msg.language)}
                        className={`p-1 rounded-lg transition-colors flex items-center gap-1 ${
                          speakingMsgId === msg.id
                            ? 'text-emerald-700 bg-emerald-50 font-bold'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`}
                        title={speakingMsgId === msg.id ? 'Stop reading' : 'Read aloud in audio'}
                      >
                        {speakingMsgId === msg.id ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[10px]">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Listen</span>
                          </>
                        )}
                      </button>
                    )}
                    <span>{msg.timestamp}</span>
                  </div>
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
                      Logged for a senior specialist to review and record verified knowledge.
                    </span>
                  </div>
                )}

                {/* Safety Notes Box */}
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

        {/* Loading / Transcribing Indicator */}
        {(loading || transcribing) && (
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
              <span>
                {transcribing
                  ? 'Transcribing voice in English / Tamil...'
                  : 'Consulting factory records & equipment specs...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form at Bottom with Mic Button */}
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
            placeholder="Ask about machine symptoms, exceptions, or operating quirks (English / தமிழ்)..."
            disabled={loading || recording || transcribing}
            className="w-full pl-5 pr-28 py-3.5 rounded-3xl border border-slate-200/90 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white shadow-soft"
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            {/* Mic Button */}
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={loading || transcribing}
              className={`p-2.5 rounded-2xl transition-all flex items-center justify-center ${
                recording
                  ? 'bg-red-600 text-white animate-pulse shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
              title={recording ? 'Stop recording voice' : 'Speak question in English or Tamil'}
              aria-label={recording ? 'Stop recording voice' : 'Speak question'}
            >
              {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputQuestion.trim() || loading || recording}
              className={`px-4 py-2 rounded-2xl text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                !inputQuestion.trim() || loading || recording
                  ? 'opacity-40 cursor-not-allowed bg-slate-400'
                  : userRole === 'industry'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
