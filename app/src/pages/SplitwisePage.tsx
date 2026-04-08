import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { formatCurrency, formatDate } from '../lib/format';
import { useModal } from '../components/ui/Modal';
import { syncSplitwiseExpenses } from '../lib/splitwise-api';
import type { SplitwiseExpense } from '../types';
import toast from 'react-hot-toast';

export default function SplitwisePage() {
  const state = useStore();
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();
  const [syncing, setSyncing] = useState(false);

  const isConnected = !!state.splitwise.apiKey;

  const balanceSummary = useMemo(() => {
    let owed = 0;
    let owe = 0;
    state.splitwise.expenses.forEach(e => {
      if (e.myBalance > 0) owed += e.myBalance;
      else if (e.myBalance < 0) owe += Math.abs(e.myBalance);
    });
    return { owed, owe, net: owed - owe };
  }, [state.splitwise.expenses]);

  const handleSync = async () => {
    if (!state.splitwise.apiKey) return;
    setSyncing(true);
    try {
      const expenses = await syncSplitwiseExpenses(state.splitwise.apiKey);
      state.updateSplitwise({
        expenses,
        lastSync: new Date().toISOString(),
      });
      toast.success(`Synced ${expenses.length} expenses`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        openCorsHelp();
      } else {
        toast.error(message);
      }
    } finally {
      setSyncing(false);
    }
  };

  const openApiKeyForm = () => {
    openModal(<ApiKeyForm onClose={closeModal} />);
  };

  const openCorsHelp = () => {
    openModal(
      <div>
        <div className="modal-header">
          <div className="modal-title">CORS Issue</div>
          <button className="modal-close" onClick={closeModal}>&times;</button>
        </div>
        <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
          <p className="mb-3">
            Browser security prevents direct API calls to Splitwise. You can fix this by:
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Using a CORS proxy (add <code className="text-xs bg-[var(--bg-input)] px-1 py-0.5 rounded">https://cors-anywhere.herokuapp.com/</code> before the API URL)</li>
            <li>Running a local proxy server</li>
            <li>Using a browser extension that allows CORS</li>
          </ol>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Note: This is a browser limitation, not a bug. The Splitwise API does not support CORS from browser clients.
          </p>
        </div>
        <button className="btn btn-primary w-full mt-4" onClick={closeModal}>Got it</button>
      </div>
    );
  };

  const openExpenseDetail = (expense: SplitwiseExpense) => {
    openModal(
      <div>
        <div className="modal-header">
          <div className="modal-title">{expense.description}</div>
          <button className="modal-close" onClick={closeModal}>&times;</button>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-xs text-[var(--text-muted)]">{formatDate(expense.date)}</div>
            <div className="text-xs text-[var(--text-muted)]">{expense.groupName}</div>
          </div>
          <div className="text-xl font-extrabold">{formatCurrency(expense.cost)}</div>
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">Paid By</div>
          {expense.paidBy.map((p, i) => (
            <div key={i} className="flex justify-between py-1">
              <span className="text-sm">{p.name}</span>
              <span className="text-sm font-bold">{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">Split With</div>
          {expense.splitWith.map((p, i) => (
            <div key={i} className="flex justify-between py-1">
              <span className="text-sm">{p.name}</span>
              <span className="text-sm font-bold">{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </div>

        <div className={`text-center p-3 rounded-xl ${expense.myBalance >= 0 ? 'bg-[var(--green-bg)] text-[var(--green)]' : 'bg-[var(--red-bg)] text-[var(--red)]'}`}>
          <div className="text-xs font-semibold uppercase">Your Balance</div>
          <div className="text-lg font-extrabold">
            {expense.myBalance >= 0 ? '+' : ''}{formatCurrency(expense.myBalance)}
          </div>
        </div>

        <button className="btn btn-primary w-full mt-4" onClick={() => {
          importAsTransaction(expense);
          closeModal();
        }}>
          Import as Transaction
        </button>
      </div>
    );
  };

  const importAsTransaction = (expense: SplitwiseExpense) => {
    const defaultAccountId = state.settings.defaultAccountId || state.accounts[0]?.id || '';
    const miscCategory = state.categories.find(c => c.name.toLowerCase().includes('misc'))?.id || state.categories[0]?.id || '';

    state.addTransaction({
      type: 'expense',
      date: expense.date,
      amount: expense.myOwed,
      fromAccountId: defaultAccountId,
      toAccountId: null,
      categoryId: miscCategory,
      merchant: expense.description,
      note: `Splitwise: ${expense.groupName}`,
      tags: ['splitwise'],
      subCategory: '',
      isRecurring: false,
      recurringConfig: null,
      isReimbursable: false,
      settlementStatus: null,
      settledAmount: 0,
      personId: null,
      splitDetails: null,
    });
    toast.success('Imported as transaction');
  };

  // Disconnected state
  if (!isConnected) {
    return (
      <div className="screen active">
        <div className="screen-header">
          <button className="btn btn-sm btn-ghost" onClick={() => navigate('/more')}>&larr; Back</button>
          <div className="screen-title">Splitwise</div>
          <div />
        </div>

        <div className="empty-state">
          <div className="empty-icon">🔗</div>
          <p className="mb-4">Connect your Splitwise account to sync shared expenses.</p>
          <button className="btn btn-primary" onClick={openApiKeyForm}>Connect Splitwise</button>
        </div>

        <div className="card p-4 mt-4">
          <div className="text-sm font-semibold mb-2">How to get your API key</div>
          <ol className="text-xs text-[var(--text-secondary)] list-decimal pl-5 space-y-1.5 leading-relaxed">
            <li>Go to Splitwise developer settings</li>
            <li>Register a new application</li>
            <li>Copy the API key</li>
            <li>Paste it in the connection form above</li>
          </ol>
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div className="screen active">
      <div className="screen-header">
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/more')}>&larr; Back</button>
        <div className="screen-title">Splitwise</div>
        <button className="btn btn-sm btn-primary" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing...' : '🔄 Sync'}
        </button>
      </div>

      {/* Balance Summary */}
      <div className="stat-pills mb-4">
        <div className="stat-pill">
          <div className="sp-label">You are owed</div>
          <div className="sp-value text-[var(--green)]">{formatCurrency(balanceSummary.owed)}</div>
        </div>
        <div className="stat-pill">
          <div className="sp-label">You owe</div>
          <div className="sp-value text-[var(--red)]">{formatCurrency(balanceSummary.owe)}</div>
        </div>
      </div>

      {state.splitwise.lastSync && (
        <div className="text-xs text-[var(--text-muted)] mb-3">
          Last synced: {new Date(state.splitwise.lastSync).toLocaleString()}
        </div>
      )}

      {/* API Key Management */}
      <div className="flex gap-2 mb-4">
        <button className="btn btn-sm btn-secondary flex-1" onClick={openApiKeyForm}>
          ⚙️ API Key
        </button>
        <button className="btn btn-sm btn-secondary flex-1" onClick={openCorsHelp}>
          ❓ CORS Help
        </button>
      </div>

      {/* Expense List */}
      <div className="section-header">
        <div className="section-title">Expenses</div>
        <span className="text-xs text-[var(--text-muted)]">{state.splitwise.expenses.length} total</span>
      </div>

      {state.splitwise.expenses.map(expense => (
        <div key={expense.id} className="txn-row" onClick={() => openExpenseDetail(expense)}>
          <div className={`txn-row-icon ${expense.myBalance >= 0 ? 'bg-[var(--green-bg)]' : 'bg-[var(--red-bg)]'}`}>
            <span>🔗</span>
          </div>
          <div className="txn-row-info">
            <div className="txn-row-title truncate">{expense.description}</div>
            <div className="txn-row-meta">
              <span>{formatDate(expense.date)}</span>
              <span>&middot;</span>
              <span>{expense.groupName}</span>
            </div>
          </div>
          <div className="txn-row-amt">
            <div className={`amt-val ${expense.myBalance >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
              {expense.myBalance >= 0 ? '+' : ''}{formatCurrency(expense.myBalance)}
            </div>
            <div className="amt-sub">of {formatCurrency(expense.cost)}</div>
          </div>
        </div>
      ))}

      {state.splitwise.expenses.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No expenses synced yet. Tap Sync to fetch from Splitwise.</p>
        </div>
      )}
    </div>
  );
}

// API Key Form sub-component
function ApiKeyForm({ onClose }: { onClose: () => void }) {
  const state = useStore();
  const [apiKey, setApiKey] = useState(state.splitwise.apiKey);

  const handleSave = () => {
    state.updateSplitwise({ apiKey: apiKey.trim() });
    toast.success(apiKey.trim() ? 'API key saved' : 'API key removed');
    onClose();
  };

  const handleDisconnect = () => {
    state.updateSplitwise({ apiKey: '', expenses: [], lastSync: null });
    toast.success('Splitwise disconnected');
    onClose();
  };

  return (
    <div>
      <div className="modal-header">
        <div className="modal-title">Splitwise API Key</div>
        <button className="modal-close" onClick={onClose}>&times;</button>
      </div>
      <div className="form-group">
        <label className="form-label">API Key</label>
        <input type="text" className="form-control" placeholder="Paste your Splitwise API key" value={apiKey}
          onChange={e => setApiKey(e.target.value)} />
      </div>
      <div className="flex gap-2.5">
        {state.splitwise.apiKey && (
          <button className="btn btn-danger flex-1" onClick={handleDisconnect}>Disconnect</button>
        )}
        <button className="btn btn-primary flex-1" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
