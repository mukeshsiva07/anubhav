'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  FileEdit,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  Mail,
  ShieldAlert,
  Building,
  Phone,
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export default function HelpPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      question: 'How does the entry approval process work?',
      answer:
        'When you submit an entry from "Record Info", its status becomes "pending". The plant industry administrator reviews the advice, checks for safety compliance, and verifies accuracy. Once approved, the entry is immediately published to the master library and ingested into the Ask AI knowledge base. If rejected, you will receive a specific explanation and can edit and resubmit.',
    },
    {
      question: 'Why does the AI say "No record found" for some of my questions?',
      answer:
        'Anubhav is strictly grounded to plant safety. Unlike generic AI chatbots, it NEVER guesses or invents machine fixes. It only synthesizes answers from verified, admin-approved entries and the official machine specifications. When no record exists, your question is automatically logged to the plant administrator so senior experts can record the missing procedure.',
    },
    {
      question: 'What qualifies as a "Safety-Critical" entry?',
      answer:
        'Any procedure involving high-voltage electrical panels, steam lines above 5 bar, heavy crane rigging, hydraulic daylight zones, chemical degreasers, or machine spindle interlocks must be marked as safety-critical. These appear with a red border and receive prioritized AI safety citations.',
    },
    {
      question: 'Can other operators see my draft or pending entries?',
      answer:
        'No. Under our strict plant privacy rules, only you and the organization administrators can see your drafts, pending revisions, or rejected entries. Other operators can only see approved entries.',
    },
    {
      question: 'How do I edit an entry that has already been approved?',
      answer:
        'When you edit an approved entry, Anubhav creates a new pending revision rather than modifying live shopfloor advice. This guarantees that unverified changes never mislead technicians on active machinery.',
    },
    {
      question: 'Can I dictate my entries using voice instead of typing?',
      answer:
        'Yes! If your browser supports speech recognition (like Google Chrome or Edge), a microphone icon appears in the "Record Info" toolbar. Tap it to dictate your observations in real time.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Operator Handbook & FAQ</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-slate-900">
          How to Use Anubhav
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          A quick guide to preserving institutional memory and getting zero-hallucination answers on the floor.
        </p>
      </div>

      {/* 3 Step Interactive Workflow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-soft">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
            <FileEdit className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Step 1</span>
          <h3 className="font-display text-base font-bold text-slate-900 mt-1 mb-2">
            Record Info
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Notice a subtle vibration quirk or thermal expansion trick? Use our rich text editor or voice dictation to record the symptom and your exact solution.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-soft">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">Step 2</span>
          <h3 className="font-display text-base font-bold text-slate-900 mt-1 mb-2">
            Plant Admin Review
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            The plant engineering leadership reviews your entry for technical validity, safety interlocks, and PPE protocols before granting live approval.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-soft">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Step 3</span>
          <h3 className="font-display text-base font-bold text-slate-900 mt-1 mb-2">
            Ask AI Assistant
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Freshers and colleagues query the AI anytime. Answers quote the exact senior technician and machine record that solved the problem.
          </p>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-slate-900 mb-2">
          Frequently Asked Questions
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Answers to common questions about permissions, revisions, and plant safety.
        </p>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="border border-slate-200/80 rounded-2xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-800">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="p-4 pt-1 bg-white text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Contact Information */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-soft">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">
              Need plant admin assistance?
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Contact Aurobindo Manufacturing Plant Operations Desk for ID resets or equipment additions.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 text-xs font-semibold">
          <div className="flex items-center gap-2 bg-slate-800 px-3.5 py-2 rounded-xl text-slate-200 border border-slate-700">
            <Mail className="w-4 h-4 text-emerald-400" />
            <span>admin@aurobindo-mfg.com</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-800 px-3.5 py-2 rounded-xl text-slate-200 border border-slate-700">
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>Ext. #4401 (Safety Cell)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

