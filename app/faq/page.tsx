// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { getRoleFromSession } from '@/utils/auth';
import Link from 'next/link';
import { Box, Typography, Collapse, Divider } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlineOutlined';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

// ── Page link button (inline, used inside answer text) ───────────────────────

function PageLink({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-semibold border border-[var(--color-main)] text-[var(--color-main)] hover:bg-[var(--color-main)] hover:text-white transition-colors"
    >
      {children}
      <OpenInNewIcon sx={{ fontSize: 11, ml: '1px' }} />
    </Link>
  );
}

// ── FAQ data ─────────────────────────────────────────────────────────────────

const FAQ_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    href: null,
    items: [
      {
        q: 'What is The Circular Classroom?',
        a: 'The Circular Classroom (TCC) is an inventory management system that helps schools track, manage, and redistribute donated school uniforms and items. It supports donation drives, inventory tracking, file approvals, and analytics.',
      },
      {
        q: 'How do I log in to the system?',
        a: 'Enter your email and password on the login page. If you have forgotten your password, click "Forgot Password" and follow the instructions sent to your registered email address.',
      },
      {
        q: 'What roles are available in the system?',
        a: (
          <div className="space-y-2 text-sm text-gray-700">
            <p>The system has the following roles, each with different levels of access:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li><span className="font-semibold">TCC Administrator</span> — Full system access including file approval, all schools&apos; inventory, and analytics.</li>
              <li><span className="font-semibold">School Staff</span> — Can manage their school&apos;s inventory, update item statuses, and view transactions.</li>
              <li><span className="font-semibold">Parent Support Group (PSG)</span> — Can view active donation drives and submit donations via CSV upload.</li>
            </ul>
          </div>
        ),
      },
      {
        q: 'Who do I contact if I cannot access the system?',
        a: 'Please contact your school administrator or the TCC Administrator for account-related issues such as login problems or incorrect role assignments.',
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory Management',
    icon: '📦',
    href: '/inventory',
    items: [
      {
        q: 'How do I view the inventory?',
        a: (
          <p className="text-sm text-gray-700 leading-relaxed">
            Click on <PageLink href="/inventory">Inventory Management</PageLink> in the top navigation bar. You will see a list of item types grouped by category. Click on any item type card to see a detailed breakdown of individual items.
          </p>
        ),
      },
      {
        q: 'What do the inventory quantity fields mean?',
        a: (
          <div className="space-y-2 text-sm text-gray-700">
            <p>Each item type card shows the following quantities:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li><span className="font-semibold">School Stock</span> — Items currently held at the school for distribution.</li>
              <li><span className="font-semibold">PSG Activities</span> — Items allocated for Parent Support Group activities.</li>
              <li><span className="font-semibold">For Repurposing</span> — Items set aside to be repurposed (visible to admins).</li>
              <li><span className="font-semibold">For Recycling/Disposal</span> — Items marked for recycling or disposal (visible to admins).</li>
            </ul>
          </div>
        ),
      },
      {
        q: 'How do I update an item\'s status?',
        a: (
          <p className="text-sm text-gray-700 leading-relaxed">
            Go to the <PageLink href="/update-status">Update Item Status</PageLink> section. Search for the item by its ID or description, then select the new status from the dropdown. Changes are logged as a transaction for record-keeping.
          </p>
        ),
      },
      {
        q: 'What item statuses are available?',
        a: (
          <div className="space-y-2 text-sm text-gray-700">
            <p>Items can be assigned the following statuses:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li><span className="font-semibold">School Stock</span> — Available at the school.</li>
              <li><span className="font-semibold">For PSG</span> — Allocated to PSG activities.</li>
              <li><span className="font-semibold">For Repurposing</span> — Flagged for repurposing.</li>
              <li><span className="font-semibold">For Recycling/Disposal</span> — Flagged for recycling or disposal.</li>
            </ul>
          </div>
        ),
      },
      {
        q: 'How are item colour swatches shown?',
        a: 'Colour swatches are displayed on each item type card. Up to 3 colours are shown as filled dots. If there are more than 3 colours, a "+N" label indicates the additional count. Hover over a dot to see the colour name.',
      },
    ],
  },
  {
    id: 'donations',
    title: 'Donation Drives',
    icon: '🎁',
    href: '/donation-drives',
    items: [
      {
        q: 'How do I find active donation drives?',
        a: (
          <p className="text-sm text-gray-700 leading-relaxed">
            Navigate to the <PageLink href="/donation-drives">Donation Drives</PageLink> page. Active drives are listed with their names, associated schools, and open/close dates. You can filter by school or status using the search bar.
          </p>
        ),
      },
      {
        q: 'How do I submit a donation?',
        a: 'Open an active donation drive and click "Donate". You can either fill in the item details manually using the donation form, or upload a CSV file with multiple item records at once.',
      },
      {
        q: 'How do I upload a donation via CSV?',
        a: (
          <div className="space-y-2 text-sm text-gray-700">
            <p>Follow these steps to upload a CSV donation file:</p>
            <ol className="list-decimal list-inside space-y-1 mt-1">
              <li>Open the donation drive and click <span className="font-semibold">Upload CSV</span>.</li>
              <li>Download the CSV template by clicking <span className="font-semibold">Download Template</span> to ensure your file follows the correct format.</li>
              <li>Fill in your item details in the template (do not change column headers).</li>
              <li>Upload the completed file. The system will validate it and show any errors.</li>
              <li>Fix any reported errors and re-upload if needed.</li>
            </ol>
          </div>
        ),
      },
      {
        q: 'What file types are supported for CSV upload?',
        a: 'The system accepts .csv, .xls, and .xlsx files. The maximum file size is 10 MB. Files must match the expected column headers from the downloadable template.',
      },
      {
        q: 'What are the rules for the CSV file fields?',
        a: (
          <div className="space-y-3 text-sm text-gray-700">
            <p>The template has the following columns for each item type. Grey/locked cells are pre-filled — only edit the white cells:</p>
            <table className="w-full text-xs border-collapse mt-1">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700 w-36">Column</th>
                  <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Rule</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-50/50">
                  <td className="px-3 py-2 border border-gray-200 font-medium text-gray-500 italic">Item name</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-500">Pre-filled and locked — do not modify.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 border border-gray-200 font-medium text-gray-500 italic">Location</td>
                  <td className="px-3 py-2 border border-gray-200 text-gray-500">Pre-filled as &quot;School&quot; and locked — do not modify.</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-3 py-2 border border-gray-200 font-semibold">For PSG</td>
                  <td className="px-3 py-2 border border-gray-200">Whole number, 0 or greater. Leave as 0 if not donating for PSG.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 border border-gray-200 font-semibold">For School Stock</td>
                  <td className="px-3 py-2 border border-gray-200">Whole number, 0 or greater. Leave as 0 if not donating to school stock.</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-3 py-2 border border-gray-200 font-semibold">For recycling/<wbr />disposal</td>
                  <td className="px-3 py-2 border border-gray-200">Whole number, 0 or greater. Leave as 0 if not applicable.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 border border-gray-200 font-semibold">Remarks</td>
                  <td className="px-3 py-2 border border-gray-200">
                    Optional. Maximum 500 characters. The following characters are <span className="font-semibold text-red-600">not allowed</span>:{' '}
                    <code className="bg-gray-100 px-1 rounded">&lt; &gt; &#123; &#125; ` &apos; ; $ -- /*</code>
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-semibold">Sizes:</span> Quantities are uploaded as &quot;One Size&quot; by default. If the item has multiple sizes, you can split quantities by size on the upload page before submitting.
            </p>
          </div>
        ),
      },
      {
        q: 'Why was my CSV file rejected?',
        a: 'The system validates each row of your file. Common reasons for rejection include: missing required fields, invalid values (e.g., unknown item type or size), quantity not being a positive whole number, or remarks containing disallowed special characters. The error message will tell you exactly which rows and fields need to be corrected.',
      },
    ],
  },
  {
    id: 'file-approval',
    title: 'File Approval',
    icon: '✅',
    href: '/file-approval',
    adminOnly: true,
    items: [
      {
        q: 'What is the file approval process?',
        a: 'When a CSV donation file is uploaded, it is first placed in a "pending" queue for review by a TCC Administrator. The administrator reviews the file content and either approves it (moving it to validated storage) or denies it (marking it as failed). Approved files are then processed into the inventory.',
      },
      {
        q: 'Where can I see pending files for approval?',
        a: (
          <p className="text-sm text-gray-700 leading-relaxed">
            TCC Administrators can access the <PageLink href="/file-approval">Files Approval</PageLink> section from the navigation menu. This shows all files currently awaiting review, along with the uploader&apos;s details and upload date.
          </p>
        ),
      },
      {
        q: 'How do I approve or deny a file?',
        a: (
          <p className="text-sm text-gray-700 leading-relaxed">
            In the <PageLink href="/file-approval">Files Approval</PageLink> page, click on a file to preview its contents. Use the &quot;Approve&quot; button to accept the file and move it to validated storage, or the &quot;Deny&quot; button to reject it. Denied files are moved to a failed folder and the uploader is notified.
          </p>
        ),
      },
      {
        q: 'Can I view previously approved files?',
        a: 'Yes. The "Validated Files" section lists all previously approved files. You can click on any file to view its contents including item details, quantities, and conditions.',
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: '📊',
    href: '/analytics/overview',
    items: [
      {
        q: 'What analytics are available?',
        a: 'The Analytics module provides insights into inventory levels, donation trends, item distribution by category, school-level breakdowns, and transaction histories. Charts and summary cards update automatically based on the latest data.',
      },
      {
        q: 'How do I switch between analytics views?',
        a: (
          <p className="text-sm text-gray-700 leading-relaxed">
            Use the <PageLink href="/analytics/overview">Analytics</PageLink> navigation tabs at the top of the analytics section to switch between different views such as Overview, Inventory, and Donations.
          </p>
        ),
      },
      {
        q: 'Can I filter analytics by school?',
        a: 'Yes. TCC Administrators can filter analytics by school using the school selector. School staff see data scoped to their own school by default.',
      },
      {
        q: 'How often is the analytics data updated?',
        a: 'Analytics data reflects the current state of the inventory and transactions in real time. There is no manual refresh needed — data updates whenever transactions or inventory changes are recorded.',
      },
    ],
  },
  {
    id: 'transactions',
    title: 'Transactions',
    icon: '🔄',
    href: '/transaction',
    items: [
      {
        q: 'What is a transaction?',
        a: 'A transaction is a recorded event that changes the state of an item, such as a donation received, a status change, a transfer between schools, a sale, repurposing, or disposal. Every change is logged for full traceability.',
      },
      {
        q: 'Where can I view transaction history?',
        a: (
          <p className="text-sm text-gray-700 leading-relaxed">
            Navigate to the <PageLink href="/transaction">Transaction</PageLink> page from the inventory navigation. You can search, filter by transaction type, and click on any transaction row to expand its full details.
          </p>
        ),
      },
      {
        q: 'What transaction types are recorded?',
        a: (
          <div className="space-y-2 text-sm text-gray-700">
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-semibold">Donation In</span> — Items received via a donation drive.</li>
              <li><span className="font-semibold">Transfer</span> — Items moved between schools.</li>
              <li><span className="font-semibold">Status Change</span> — An item&apos;s status was updated.</li>
              <li><span className="font-semibold">Sale</span> — Items sold.</li>
              <li><span className="font-semibold">Repurposing</span> — Items sent for repurposing.</li>
              <li><span className="font-semibold">Disposal</span> — Items disposed of or recycled.</li>
            </ul>
          </div>
        ),
      },
    ],
  },
];

// ── FAQ Item (single accordion row) ──────────────────────────────────────────

function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <Box sx={{ borderBottom: '1px solid', borderColor: 'rgba(229, 231, 235, 1)' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-[#f8faf8] transition-colors cursor-pointer"
      >
        <span className="text-sm font-medium text-gray-800 leading-relaxed">{question}</span>
        <span className="flex-shrink-0 mt-0.5 text-[var(--color-main)]">
          {isOpen ? <ExpandLessIcon sx={{ fontSize: 20 }} /> : <ExpandMoreIcon sx={{ fontSize: 20 }} />}
        </span>
      </button>
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <Box sx={{ px: 2.5, pb: 2.5, pt: 0.5 }}>
          {typeof answer === 'string' ? (
            <Typography variant="body2" sx={{ color: '#4b5563', lineHeight: 1.75 }}>
              {answer}
            </Typography>
          ) : (
            answer
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function FAQSection({ section, openItems, onToggle, matchesSearch }) {
  const visibleItems = section.items.filter((item) => matchesSearch(item));
  if (visibleItems.length === 0) return null;

  return (
    <Box
      sx={{
        borderRadius: 2,
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.07)',
        border: '1px solid rgba(229, 231, 235, 1)',
        backgroundColor: '#fff',
        overflow: 'hidden',
      }}
    >
      {/* Section header */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid rgba(229, 231, 235, 1)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <span className="text-lg">{section.icon}</span>
        {section.href ? (
          <Link
            href={section.href}
            className="inline-flex items-center gap-1 font-bold text-[var(--color-darker)] hover:text-[var(--color-main)] hover:underline underline-offset-2 transition-colors group"
            style={{ fontSize: '1rem', lineHeight: 1.3 }}
          >
            {section.title}
            <OpenInNewIcon sx={{ fontSize: 14, opacity: 0.6, mt: '1px' }} className="group-hover:opacity-100" />
          </Link>
        ) : (
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: 'var(--color-darker)', lineHeight: 1.3 }}
          >
            {section.title}
          </Typography>
        )}
        <Box
          sx={{
            ml: 'auto',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--color-main)',
            bgcolor: 'rgba(105,170,86,0.12)',
            borderRadius: '999px',
            px: 1.25,
            py: 0.25,
          }}
        >
          {visibleItems.length} {visibleItems.length === 1 ? 'question' : 'questions'}
        </Box>
      </Box>

      {/* FAQ items */}
      {visibleItems.map((item) => (
        <FAQItem
          key={item.q}
          question={item.q}
          answer={item.a}
          isOpen={!!openItems[`${section.id}::${item.q}`]}
          onToggle={() => onToggle(`${section.id}::${item.q}`)}
        />
      ))}
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FAQPage() {
  const [openItems, setOpenItems] = useState({});
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('UNKNOWN');

  useEffect(() => {
    setRole(getRoleFromSession() || 'UNKNOWN');
  }, []);

  const isAdmin = role === 'TCC_ADMIN';

  const visibleSections = FAQ_SECTIONS.filter(
    (section) => !section.adminOnly || isAdmin,
  );

  const handleToggle = (key) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const matchesSearch = (item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const questionMatch = item.q.toLowerCase().includes(q);
    const answerMatch =
      typeof item.a === 'string' && item.a.toLowerCase().includes(q);
    return questionMatch || answerMatch;
  };

  const totalVisible = visibleSections.reduce(
    (sum, section) => sum + section.items.filter(matchesSearch).length,
    0,
  );

  const handleExpandAll = () => {
    const allKeys = {};
    visibleSections.forEach((section) => {
      section.items.filter(matchesSearch).forEach((item) => {
        allKeys[`${section.id}::${item.q}`] = true;
      });
    });
    setOpenItems(allKeys);
  };

  const handleCollapseAll = () => setOpenItems({});

  const anyOpen = Object.values(openItems).some(Boolean);

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 900, mx: 'auto' }}>
      {/* Page header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <HelpOutlineIcon sx={{ fontSize: 28, color: 'var(--color-main)' }} />
          <Typography
            variant="h4"
            fontWeight={700}
            sx={{ color: 'var(--color-darker)', lineHeight: 1.2 }}
          >
            Frequently Asked Questions
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: '44px' }}>
          Find answers to common questions about using The Circular Classroom system.
        </Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Search bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 200,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            border: '1px solid rgba(209, 213, 219, 1)',
            borderRadius: 2,
            px: 1.5,
            py: 0.75,
            bgcolor: '#fff',
            '&:focus-within': {
              borderColor: 'var(--color-main)',
              boxShadow: '0 0 0 2px rgba(105,170,86,0.15)',
            },
            transition: 'box-shadow 0.15s, border-color 0.15s',
          }}
        >
          <SearchIcon sx={{ fontSize: 18, color: '#9ca3af', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none border-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </Box>

        {/* Expand / Collapse all */}
        <button
          onClick={anyOpen ? handleCollapseAll : handleExpandAll}
          className="text-sm font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer whitespace-nowrap"
        >
          {anyOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </Box>

      {/* No results */}
      {search && totalVisible === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            borderRadius: 2,
            bgcolor: '#f9fafb',
            border: '1px dashed rgba(209, 213, 219, 1)',
          }}
        >
          <HelpOutlineIcon sx={{ fontSize: 36, color: '#d1d5db', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            No questions match &quot;{search}&quot;. Try different keywords.
          </Typography>
        </Box>
      )}

      {/* FAQ sections */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {visibleSections.map((section) => (
          <FAQSection
            key={section.id}
            section={section}
            openItems={openItems}
            onToggle={handleToggle}
            matchesSearch={matchesSearch}
          />
        ))}
      </Box>

      {/* Footer note */}
      <Box
        sx={{
          mt: 5,
          p: 2.5,
          borderRadius: 2,
          bgcolor: 'var(--color-bg-light)',
          border: '1px solid rgba(105,170,86,0.2)',
          display: 'flex',
          gap: 1.5,
          alignItems: 'flex-start',
        }}
      >
        <span className="text-base mt-0.5">💬</span>
        <Typography variant="body2" sx={{ color: 'var(--color-darker)', lineHeight: 1.7 }}>
          <strong>Still have questions?</strong> Contact your school administrator or the TCC Administrator for further assistance.
        </Typography>
      </Box>
    </Box>
  );
}
