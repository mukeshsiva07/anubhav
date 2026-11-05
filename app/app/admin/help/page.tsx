'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  Users,
  Cpu,
  Building,
  MessageSquare,
  Layers,
  ChevronDown,
  ShieldAlert,
  KeyRound,
  FileText,
  Sparkles,
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export default function AdminHelpPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const guideSections = [
    {
      title: 'Approving, Rejecting & Editing Entries',
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      description:
        'Technicians submit field notes, setup steps, and troubleshooting tips. Every entry sits in the Pending Approval Queue until verified by a plant admin.',
      steps: [
        'Navigate to Manage Entries from the sidebar.',
        'Review the technician author, associated machine, and safety flags.',
        'Click "Edit Before Approving" if you need to fix formatting, add clarification, or adjust safety warnings before publication.',
        'Click "Approve" to immediately make the record live and accessible to Ask AI.',
        'Click "Reject" to supply mandatory technical feedback so the technician can revise and resubmit.',
      ],
    },
    {
      title: 'Executing Bulk Actions',
      icon: Layers,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      description:
        'During high-volume plant shifts, you can batch process entries without reviewing each card individually.',
      steps: [
        'Use the checkbox on each card or click "Select All".',
        'Click "Approve Selected" to publish all selected submissions at once.',
        'Click "Reject Selected" to provide feedback and reject the batch together.',
      ],
    },
    {
      title: 'Managing Employees & Passwords',
      icon: Users,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      description:
        'Control plant personnel authorization, system login credentials, and Senior / Verified endorsements.',
      steps: [
        'Add New Employee: Supply technician details and set a strong password (minimum 8 characters) or click "Generate".',
        'Senior / Verified Toggle: Mark seasoned operators (10+ years or designated leads) to display a verified credentials badge.',
        'Change Password: Click the key icon on any employee row to set a new password on demand.',
        'Retire / Remove: When an employee departs, their record can be removed while their authored technical entries remain credited and preserved.',
      ],
    },
    {
      title: 'Managing Machines & Photo Galleries',
      icon: Cpu,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      description:
        'Keep factory equipment rosters accurate, update operational statuses, and upload visual reference galleries.',
      steps: [
        'Register machinery with model name, category, and shop floor department.',
        'Status Tracking: Keep operators informed with Active (green), Inactive (grey), Under Maintenance (amber), or Retired (red).',
        'Photo Gallery: Upload multiple high-resolution photos of control panels, tooling setups, and lubrication points.',
        'Select any gallery photo as the primary equipment thumbnail.',
      ],
    },
    {
      title: 'Managing the Industry Profile',
      icon: Building,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      description:
        'Configure plant identity, administrative contact points, official plant logo, and factory classification.',
      steps: [
        'Click your profile avatar at the top right and select "Industry Profile".',
        'Update plant name, official email, phone hotline, and facility address.',
        'Upload your factory or enterprise logo to brand the portal.',
        'Your plant Organization Code (e.g., ORG-XXXXXX) is read-only and links all technician accounts to your workspace.',
      ],
    },
    {
      title: 'Handling Unanswered Questions',
      icon: MessageSquare,
      color: 'text-rose-600 bg-rose-50 border-rose-200',
      description:
        'Anubhav adheres to strict zero-hallucination standards. When a worker asks a question that does not match verified factory records, the query is logged for plant experts.',
      steps: [
        'When workers receive "No record found. This question has been logged for an expert", the knowledge gap is recorded in the audit trail.',
        'Review logged inquiries to identify missing operating procedures or unrecorded machine quirks.',
        'Create a new knowledge entry covering the topic or assign a senior technician to document it.',
        'Once approved, Ask AI will immediately begin answering similar future inquiries accurately in English and Tamil.',
      ],
    },
  ];

  const faqs: FAQItem[] = [
    {
      category: 'Governance',
      question: 'Can technicians see unapproved or rejected entries?',
      answer:
        'No. Technicians can only see their own pending and rejected drafts in their Entries page. Only approved entries are visible to other employees and indexed by the Ask AI search model.',
    },
    {
      category: 'Security',
      question: 'What happens when an employee leaves the company?',
      answer:
        'When you delete an employee from the roster, their account is permanently deleted. However, all approved knowledge entries they authored are preserved for the factory and credited to their name as "(Former employee)" to maintain operational continuity.',
    },
    {
      category: 'AI & Retrieval',
      question: 'How does Ask AI answer in Tamil?',
      answer:
        'Ask AI automatically detects the input language. If an operator asks a question in Tamil (spoken or typed), the system retrieves the relevant verified factory records and generates the synthesized answer entirely in Tamil script, with matching voice playback.',
    },
    {
      category: 'Files & Media',
      question: 'What file types can be uploaded to the vault?',
      answer:
        'Anubhav supports images (PNG, JPG, WebP) and documents (PDF, DOCX, XLSX, PPTX, TXT) up to 10 MB per file. Direct-to-storage signed URLs are used so large uploads remain smooth without server timeouts.',
    },
    {
      category: 'Passwords',
      question: 'Can employees change their own passwords?',
      answer:
        'To prevent unauthorized credential changes on shared plant terminals, password changes are managed directly by plant administrators from the Manage Factory Employees console.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
          Plant Administration Guide &amp; Help Desk
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Comprehensive manual for plant managers and system administrators governing the Anubhav Knowledge Vault.
        </p>
      </div>

      {/* Guide Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {guideSections.map((section, idx) => {
          const Icon = section.icon;

          return (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 ${section.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    {section.title}
                  </h2>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {section.description}
                </p>

                <div className="space-y-2 border-t border-slate-100 pt-3">
                  {section.steps.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-2 text-xs text-slate-700">
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {sIdx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ Accordion Section */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Frequently Asked Questions (Admin FAQ)
            </h2>
            <p className="text-xs text-slate-500">
              Answers to common governance, security, and storage questions.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {faqs.map((faq, fIdx) => {
            const isOpen = openFaqIndex === fIdx;

            return (
              <div key={fIdx} className="py-3.5">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : fIdx)}
                  className="w-full flex items-center justify-between text-left gap-4 font-semibold text-xs sm:text-sm text-slate-800 hover:text-rose-600 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {faq.category}
                    </span>
                    <span>{faq.question}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-rose-600' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="mt-2 text-xs text-slate-600 leading-relaxed pl-1 sm:pl-2 pt-1">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

