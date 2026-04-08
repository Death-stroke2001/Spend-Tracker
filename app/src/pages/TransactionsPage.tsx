import { useState, useMemo, useCallback } from 'react';
import { useStore, getAccountById, getCategoryById } from '../store';
import { useModal } from '../components/ui/Modal';
import TransactionForm from '../components/transactions/TransactionForm';
import TransactionItem from '../components/transactions/TransactionItem';
import { exportTransactionsCSV } from '../lib/csv';
import type { Transaction } from '../types';

const TYPE_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'Lent', value: 'lent' },
  { label: 'Borrowed', value: 'borrowed' },
  { label: 'Group Split', value: 'group_split' },
];

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Highest', value: 'highest' },
  { label: 'Lowest', value: 'lowest' },
];

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const state = useStore();
  const { openModal } = useModal();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filter state
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterTag, setFilterTag] = useState('');

  const filtered = useMemo(() => {
    let txns = [...state.transactions];

    // Type filter
    if (typeFilter !== 'all') {
      txns = txns.filter(t => t.type === typeFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      txns = txns.filter(t => {
        const cat = getCategoryById(state, t.categoryId);
        return (
          t.merchant?.toLowerCase().includes(q) ||
          t.note?.toLowerCase().includes(q) ||
          cat?.name.toLowerCase().includes(q) ||
          t.tags?.some(tag => tag.toLowerCase().includes(q))
        );
      });
    }

    // Advanced filters
    if (filterAccountId) {
      txns = txns.filter(t => t.fromAccountId === filterAccountId || t.toAccountId === filterAccountId);
    }
    if (filterCategoryId) {
      txns = txns.filter(t => t.categoryId === filterCategoryId);
    }
    if (filterDateFrom) {
      txns = txns.filter(t => t.date >= filterDateFrom);
    }
    if (filterDateTo) {
      txns = txns.filter(t => t.date <= filterDateTo);
    }
    if (filterTag.trim()) {
      const tag = filterTag.toLowerCase().trim();
      txns = txns.filter(t => t.tags?.some(tg => tg.toLowerCase().includes(tag)));
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        txns.sort((a, b) => b.date.localeCompare(a.date));
        break;
      case 'oldest':
        txns.sort((a, b) => a.date.localeCompare(b.date));
        break;
      case 'highest':
        txns.sort((a, b) => b.amount - a.amount);
        break;
      case 'lowest':
        txns.sort((a, b) => a.amount - b.amount);
        break;
    }

    return txns;
  }, [state, search, typeFilter, sortBy, filterAccountId, filterCategoryId, filterDateFrom, filterDateTo, filterTag]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const editTxn = useCallback((txn: Transaction) => {
    openModal(<TransactionForm editTxn={txn} />);
  }, [openModal]);

  const handleExport = () => {
    exportTransactionsCSV(
      filtered,
      (id) => getAccountById(state, id),
      (id) => getCategoryById(state, id)
    );
  };

  const clearFilters = () => {
    setFilterAccountId('');
    setFilterCategoryId('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterTag('');
    setShowFilters(false);
  };

  return (
    <div className="screen active">
      <div className="screen-header">
        <div className="screen-title">Transactions</div>
        <div className="flex gap-2">
          <button className="btn btn-sm btn-secondary" onClick={() => setShowFilters(!showFilters)}>
            🔍 Filter
          </button>
          <button className="btn btn-sm btn-secondary" onClick={handleExport}>
            📥 CSV
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input type="text" placeholder="Search transactions..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Type Filter Chips */}
      <div className="filter-bar">
        {TYPE_FILTERS.map(f => (
          <button key={f.value}
            className={`filter-chip ${typeFilter === f.value ? 'active' : ''}`}
            onClick={() => { setTypeFilter(f.value); setPage(1); }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Sort dropdown */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[var(--text-muted)]">{filtered.length} transactions</span>
        <select className="form-control text-xs py-1 px-2 w-auto" value={sortBy}
          onChange={e => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Advanced Filter Modal */}
      {showFilters && (
        <div className="card mb-4 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-sm">Advanced Filters</div>
            <button className="btn btn-sm btn-ghost" onClick={clearFilters}>Clear</button>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Account</label>
              <select className="form-control" value={filterAccountId} onChange={e => setFilterAccountId(e.target.value)}>
                <option value="">All Accounts</option>
                {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-control" value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)}>
                <option value="">All Categories</option>
                {state.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input type="date" className="form-control" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input type="date" className="form-control" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tag</label>
            <input type="text" className="form-control" placeholder="Filter by tag" value={filterTag}
              onChange={e => setFilterTag(e.target.value)} />
          </div>
        </div>
      )}

      {/* Transaction List */}
      {paginated.length > 0 ? (
        paginated.map(txn => (
          <TransactionItem key={txn.id} txn={txn} onClick={editTxn} />
        ))
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No transactions found</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>&lt;</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              const gap = prev && p - prev > 1;
              return (
                <span key={p}>
                  {gap && <span className="page-btn" style={{ cursor: 'default', border: 'none' }}>...</span>}
                  <button className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                </span>
              );
            })}
          <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>&gt;</button>
        </div>
      )}
    </div>
  );
}
