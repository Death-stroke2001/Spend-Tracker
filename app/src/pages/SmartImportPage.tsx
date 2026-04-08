import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { formatCurrency } from '../lib/format';
import { parseBulkSms, type ParsedSms } from '../lib/sms-parser';
import { categorize, categorizeIncome } from '../lib/auto-categorizer';
import { getPendingSmsTxns, removePendingSmsTxn, type PendingSmsTxn } from '../lib/sms-bridge';
import type { Transaction } from '../types';
import toast from 'react-hot-toast';

// A parsed row with user-editable fields
interface ImportRow {
  id: number;
  parsed: ParsedSms;
  categoryId: string;
  categoryName: string;
  accountId: string;
  accountName: string;
  selected: boolean;
  confidence: number;
}

const TABS = ['SMS Import', 'Email Sync'];

export default function SmartImportPage() {
  const state = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(0);
  const [smsText, setSmsText] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [showFiltered, setShowFiltered] = useState(false);
  const [hasResults, setHasResults] = useState(false);

  // Pending SMS transactions from background listener
  const [pendingTxns, setPendingTxns] = useState<PendingSmsTxn[]>([]);

  // Load pending transactions on mount
  useEffect(() => {
    const pending = getPendingSmsTxns();
    setPendingTxns(pending);

    // If opened from a notification, highlight that specific pending txn
    const pendingId = searchParams.get('pending');
    if (pendingId && pending.length > 0) {
      // Auto-scroll to pending section (it's visible by default)
    }
  }, [searchParams]);

  const categories = state.categories;
  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);

  // Match bank identifier to user's accounts
  const matchAccount = useCallback((bankName: string, accountHint: string) => {
    const aliases = state.smartImport.accountAliases;

    // Check saved aliases first
    if (aliases[bankName]) {
      const acct = state.accounts.find(a => a.id === aliases[bankName]);
      if (acct) return { id: acct.id, name: acct.name };
    }

    // Fuzzy match bank name against account names
    const lower = bankName.toLowerCase();
    for (const acct of state.accounts) {
      if (acct.name.toLowerCase().includes(lower)) {
        return { id: acct.id, name: acct.name };
      }
    }

    // Match by account hint if present
    if (accountHint) {
      for (const acct of state.accounts) {
        if (acct.name.includes(accountHint)) {
          return { id: acct.id, name: acct.name };
        }
      }
    }

    // Default account
    const defaultAcct = state.accounts.find(a => a.id === state.settings.defaultAccountId) || state.accounts[0];
    return defaultAcct ? { id: defaultAcct.id, name: defaultAcct.name } : { id: '', name: 'No account' };
  }, [state.accounts, state.settings.defaultAccountId, state.smartImport.accountAliases]);

  // Parse SMS and build rows
  const handleParse = useCallback(() => {
    if (!smsText.trim()) {
      toast.error('Paste some bank SMS messages first');
      return;
    }

    const parsed = parseBulkSms(smsText);
    if (parsed.length === 0) {
      toast.error('No messages found. Try pasting bank SMS text.');
      return;
    }

    const newRows: ImportRow[] = parsed.map((p, i) => {
      const isCredit = p.type === 'credit';
      const cat = p.isValid
        ? isCredit
          ? categorizeIncome(p.merchant, categories)
          : categorize(p.merchant, categories, state.smartImport.learnedMappings)
        : { categoryId: '', categoryName: '', confidence: 0 };

      const acct = p.isValid
        ? matchAccount(p.bankIdentifier, p.accountHint)
        : { id: '', name: '' };

      return {
        id: i,
        parsed: p,
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        accountId: acct.id,
        accountName: acct.name,
        selected: p.isValid,
        confidence: cat.confidence,
      };
    });

    setRows(newRows);
    setHasResults(true);
  }, [smsText, categories, matchAccount, state.smartImport.learnedMappings]);

  // Update a row's category
  const updateCategory = useCallback((rowId: number, catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    setRows(prev => prev.map(r =>
      r.id === rowId ? { ...r, categoryId: catId, categoryName: cat.name } : r
    ));
  }, [categories]);

  // Update a row's account
  const updateAccount = useCallback((rowId: number, acctId: string) => {
    const acct = state.accounts.find(a => a.id === acctId);
    if (!acct) return;
    setRows(prev => prev.map(r =>
      r.id === rowId ? { ...r, accountId: acctId, accountName: acct.name } : r
    ));
  }, [state.accounts]);

  // Toggle row selection
  const toggleRow = useCallback((rowId: number) => {
    setRows(prev => prev.map(r =>
      r.id === rowId ? { ...r, selected: !r.selected } : r
    ));
  }, []);

  // Select/deselect all valid rows
  const toggleAll = useCallback(() => {
    const validRows = rows.filter(r => r.parsed.isValid);
    const allSelected = validRows.every(r => r.selected);
    setRows(prev => prev.map(r =>
      r.parsed.isValid ? { ...r, selected: !allSelected } : r
    ));
  }, [rows]);

  // Import selected transactions
  const handleImport = useCallback(() => {
    const toImport = rows.filter(r => r.selected && r.parsed.isValid);
    if (toImport.length === 0) {
      toast.error('No transactions selected');
      return;
    }

    const txns: Omit<Transaction, 'id'>[] = toImport.map(row => ({
      type: row.parsed.type === 'credit' ? 'income' as const : 'expense' as const,
      date: row.parsed.date,
      amount: row.parsed.amount,
      fromAccountId: row.accountId,
      toAccountId: null,
      categoryId: row.categoryId,
      merchant: row.parsed.merchant,
      note: `SMS Import${row.parsed.bankIdentifier !== 'Unknown' ? ` (${row.parsed.bankIdentifier})` : ''}`,
      tags: ['sms-import'],
      subCategory: '',
      isRecurring: false,
      recurringConfig: null,
      isReimbursable: false,
      settlementStatus: null,
      settledAmount: 0,
      personId: null,
      splitDetails: null,
    }));

    state.addTransactionsBatch(txns);
    toast.success(`Imported ${txns.length} transaction${txns.length > 1 ? 's' : ''}`);

    // Reset
    setRows([]);
    setSmsText('');
    setHasResults(false);
  }, [rows, state]);

  // Confirm a pending SMS transaction (from background listener)
  const confirmPending = useCallback((pending: PendingSmsTxn) => {
    const acct = matchAccount(pending.parsed.bankIdentifier, pending.parsed.accountHint);
    const txn: Omit<Transaction, 'id'> = {
      type: pending.parsed.type === 'credit' ? 'income' as const : 'expense' as const,
      date: pending.parsed.date,
      amount: pending.parsed.amount,
      fromAccountId: acct.id,
      toAccountId: null,
      categoryId: pending.categoryId,
      merchant: pending.parsed.merchant,
      note: `SMS Auto${pending.parsed.bankIdentifier !== 'Unknown' ? ` (${pending.parsed.bankIdentifier})` : ''}`,
      tags: ['sms-auto'],
      subCategory: '',
      isRecurring: false,
      recurringConfig: null,
      isReimbursable: false,
      settlementStatus: null,
      settledAmount: 0,
      personId: null,
      splitDetails: null,
    };
    state.addTransactionsBatch([txn]);
    removePendingSmsTxn(pending.id);
    setPendingTxns(prev => prev.filter(p => p.id !== pending.id));
    toast.success(`Added: ${pending.parsed.merchant || 'Transaction'} ${formatCurrency(pending.parsed.amount)}`);
  }, [state, matchAccount]);

  // Dismiss a pending SMS transaction
  const dismissPending = useCallback((id: string) => {
    removePendingSmsTxn(id);
    setPendingTxns(prev => prev.filter(p => p.id !== id));
  }, []);

  // Derived data
  const validRows = useMemo(() => rows.filter(r => r.parsed.isValid), [rows]);
  const filteredRows = useMemo(() => rows.filter(r => !r.parsed.isValid), [rows]);
  const selectedRows = useMemo(() => validRows.filter(r => r.selected), [validRows]);
  const selectedTotal = useMemo(() => selectedRows.reduce((sum, r) => sum + r.parsed.amount, 0), [selectedRows]);

  // Get filter reason label
  const filterLabel = (reason: string | null) => {
    switch (reason) {
      case 'otp': return 'OTP message';
      case 'promo': return 'Promotional';
      case 'balance_only': return 'Balance alert';
      case 'no_amount': return 'No amount found';
      case 'login_alert': return 'Login alert';
      case 'empty': return 'Empty';
      default: return 'Filtered';
    }
  };

  return (
    <div className="screen active">
      <div className="screen-header">
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/more')}>&larr; Back</button>
        <div className="screen-title">Smart Import</div>
      </div>

      {/* Tabs */}
      <div className="tabs-bar mb-4">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`tab ${activeTab === i ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Pending SMS Transactions from Background Listener */}
      {activeTab === 0 && pendingTxns.length > 0 && !hasResults && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="text-sm font-semibold">New from SMS</div>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{
              background: 'var(--accent)', color: 'white',
            }}>
              {pendingTxns.length}
            </span>
          </div>
          {pendingTxns.map(pending => (
            <div
              key={pending.id}
              className="card mb-3 p-3"
              style={{
                borderLeft: `3px solid ${pending.parsed.type === 'credit' ? 'var(--green)' : 'var(--accent)'}`,
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="font-semibold text-sm">
                  {pending.parsed.merchant || pending.parsed.bankIdentifier || 'Unknown'}
                </div>
                <div className={`font-bold text-sm ${
                  pending.parsed.type === 'credit' ? 'text-[var(--green)]' : 'text-[var(--red)]'
                }`}>
                  {pending.parsed.type === 'credit' ? '+' : '-'}{formatCurrency(pending.parsed.amount)}
                </div>
              </div>
              <div className="text-xs text-[var(--text-muted)] mb-2.5">
                {pending.parsed.date} · {pending.categoryName}
                {pending.parsed.bankIdentifier !== 'Unknown' && ` · ${pending.parsed.bankIdentifier}`}
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-sm btn-primary flex-1"
                  onClick={() => confirmPending(pending)}
                >
                  Add
                </button>
                <button
                  className="btn btn-sm btn-secondary flex-1"
                  onClick={() => dismissPending(pending.id)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SMS Import Tab */}
      {activeTab === 0 && (
        <>
          {/* Input Area */}
          {!hasResults && (
            <div className="card p-4 mb-4">
              <div className="text-sm font-semibold mb-2">Paste Bank SMS</div>
              <div className="text-xs text-[var(--text-muted)] mb-3">
                Copy SMS from your phone and paste below. Separate multiple messages with blank lines.
              </div>
              <textarea
                value={smsText}
                onChange={e => setSmsText(e.target.value)}
                placeholder={`Example:\nINR 450.00 debited from A/c XX1234 on 27-Mar-26. Info: SWIGGY ORDER. Avl Bal: INR 30,310.00\n\nRs.2340 spent on HDFC Bank Card XX5678 at BIGBASKET on 26-03-2026`}
                rows={8}
                style={{
                  width: '100%',
                  background: 'var(--bg-hover)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
              <button
                className="btn btn-primary w-full mt-3"
                onClick={handleParse}
                disabled={!smsText.trim()}
              >
                Parse Messages
              </button>
            </div>
          )}

          {/* Results */}
          {hasResults && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="text-sm font-semibold">
                  {validRows.length} transaction{validRows.length !== 1 ? 's' : ''} found
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => { setHasResults(false); setRows([]); }}
                  >
                    &larr; Back
                  </button>
                  {validRows.length > 1 && (
                    <button className="btn btn-sm btn-ghost" onClick={toggleAll}>
                      {validRows.every(r => r.selected) ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
              </div>

              {/* Valid Transaction Rows */}
              {validRows.map(row => (
                <div
                  key={row.id}
                  className="card mb-3 p-3"
                  style={{
                    borderLeft: `3px solid ${row.parsed.type === 'credit' ? 'var(--green)' : 'var(--red)'}`,
                    opacity: row.selected ? 1 : 0.5,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div
                      onClick={() => toggleRow(row.id)}
                      style={{
                        width: 22, height: 22, borderRadius: 6, marginTop: 2,
                        border: `2px solid ${row.selected ? 'var(--accent)' : 'var(--border)'}`,
                        background: row.selected ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {row.selected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Top: merchant + amount */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="font-semibold text-sm truncate">
                          {row.parsed.merchant || row.parsed.bankIdentifier || 'Unknown'}
                        </div>
                        <div className={`font-bold text-sm whitespace-nowrap ml-2 ${
                          row.parsed.type === 'credit' ? 'text-[var(--green)]' : 'text-[var(--red)]'
                        }`}>
                          {row.parsed.type === 'credit' ? '+' : '-'}{formatCurrency(row.parsed.amount)}
                        </div>
                      </div>

                      {/* Date + bank */}
                      <div className="text-xs text-[var(--text-muted)] mb-2">
                        {row.parsed.date}
                        {row.parsed.bankIdentifier !== 'Unknown' && (
                          <span className="ml-1.5">· {row.parsed.bankIdentifier}</span>
                        )}
                        {row.parsed.accountHint && (
                          <span className="ml-1.5">· XX{row.parsed.accountHint}</span>
                        )}
                        {row.confidence < 0.5 && (
                          <span className="ml-1.5 text-[var(--amber)]">· Low confidence</span>
                        )}
                      </div>

                      {/* Category + Account selectors */}
                      <div className="flex gap-2 flex-wrap">
                        {/* Category selector */}
                        <select
                          value={row.categoryId}
                          onChange={e => updateCategory(row.id, e.target.value)}
                          style={{
                            background: 'var(--bg-hover)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            color: 'var(--text-primary)',
                            maxWidth: '50%',
                          }}
                        >
                          <optgroup label="Expense">
                            {expenseCategories.map(c => (
                              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Income">
                            {incomeCategories.map(c => (
                              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                            ))}
                          </optgroup>
                        </select>

                        {/* Account selector */}
                        <select
                          value={row.accountId}
                          onChange={e => updateAccount(row.id, e.target.value)}
                          style={{
                            background: 'var(--bg-hover)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            color: 'var(--text-primary)',
                            maxWidth: '50%',
                          }}
                        >
                          {state.accounts.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Filtered Section */}
              {filteredRows.length > 0 && (
                <div className="mb-3">
                  <button
                    className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2 px-1 w-full"
                    onClick={() => setShowFiltered(!showFiltered)}
                  >
                    <span style={{ transform: showFiltered ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                      &#9654;
                    </span>
                    Filtered out ({filteredRows.length})
                  </button>
                  {showFiltered && filteredRows.map(row => (
                    <div
                      key={row.id}
                      className="card mb-2 p-3"
                      style={{ opacity: 0.5 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{
                          background: 'var(--red-bg)', color: 'var(--red)', fontWeight: 600,
                        }}>
                          {filterLabel(row.parsed.filterReason)}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] truncate" style={{ lineHeight: 1.4 }}>
                        {row.parsed.rawText.substring(0, 100)}{row.parsed.rawText.length > 100 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {validRows.length === 0 && filteredRows.length > 0 && (
                <div className="empty-state">
                  <div className="empty-icon">🔍</div>
                  <p>No valid transactions found. All messages were filtered.</p>
                </div>
              )}

              {/* Import Bar */}
              {validRows.length > 0 && (
                <div style={{
                  position: 'sticky', bottom: 72, left: 0, right: 0,
                  background: 'var(--bg-card)',
                  borderTop: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '12px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
                  zIndex: 10,
                }}>
                  <div>
                    <div className="text-sm font-bold">
                      {selectedRows.length} selected
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Total: {formatCurrency(selectedTotal)}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleImport}
                    disabled={selectedRows.length === 0}
                  >
                    Import {selectedRows.length > 0 ? `(${selectedRows.length})` : ''}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Email Sync Tab - Coming Soon */}
      {activeTab === 1 && (
        <div className="card p-6 text-center">
          <div className="text-4xl mb-3">📧</div>
          <div className="font-semibold mb-1">Email Sync</div>
          <div className="text-sm text-[var(--text-muted)]">
            Coming soon! We'll scan your Gmail for receipts from Zomato, Amazon, Swiggy, and more.
          </div>
        </div>
      )}
    </div>
  );
}
