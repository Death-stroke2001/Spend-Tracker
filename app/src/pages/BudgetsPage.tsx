import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, getCategoryById, getCategorySpending } from '../store';
import { formatCurrency } from '../lib/format';
import { todayStr, getMonthStr } from '../lib/utils';
import { useModal } from '../components/ui/Modal';
import toast from 'react-hot-toast';

export default function BudgetsPage() {
  const state = useStore();
  const navigate = useNavigate();
  const { openModal, closeModal, confirmModal } = useModal();
  const currentMonth = getMonthStr(todayStr());
  const catSpending = useMemo(() => getCategorySpending(state, currentMonth), [state, currentMonth]);

  const totalSpent = useMemo(() => Object.values(catSpending).reduce((s, v) => s + v, 0), [catSpending]);
  const totalBudget = state.monthlyBudget;
  const budgetPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  // Days remaining in month
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - today.getDate();
  const dailyBudget = daysRemaining > 0 && totalBudget > 0 ? (totalBudget - totalSpent) / daysRemaining : 0;

  const budgetRows = useMemo(() => {
    return state.budgets.map(b => {
      const spent = catSpending[b.categoryId] || 0;
      const pct = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
      const cat = getCategoryById(state, b.categoryId);
      return { ...b, spent, pct, cat };
    });
  }, [state.budgets, catSpending, state]);

  const openMonthlyBudgetModal = () => {
    openModal(
      <BudgetAmountForm
        title="Monthly Budget"
        initialValue={totalBudget.toString()}
        onSave={(val) => { state.setMonthlyBudget(val); toast.success('Monthly budget updated'); closeModal(); }}
        onClose={closeModal}
      />
    );
  };

  const openAddBudget = () => {
    const usedCatIds = state.budgets.map(b => b.categoryId);
    const availableCats = state.categories.filter(c => c.type === 'expense' && !usedCatIds.includes(c.id));

    if (availableCats.length === 0) {
      toast.error('All expense categories have budgets');
      return;
    }

    openModal(
      <AddBudgetForm
        categories={availableCats}
        onSave={(catId, limit) => {
          state.addBudget({ categoryId: catId, monthlyLimit: limit });
          toast.success('Budget added');
          closeModal();
        }}
        onClose={closeModal}
      />
    );
  };

  const openEditBudget = (categoryId: string, currentLimit: number) => {
    openModal(
      <BudgetAmountForm
        title="Edit Budget"
        initialValue={currentLimit.toString()}
        onSave={(val) => { state.updateBudget(categoryId, val); toast.success('Budget updated'); closeModal(); }}
        onClose={closeModal}
        onDelete={() => {
          confirmModal({
            title: 'Delete Budget',
            message: 'Remove this category budget?',
            confirmLabel: 'Delete',
            danger: true,
            onConfirm: () => { state.deleteBudget(categoryId); toast.success('Budget deleted'); },
          });
        }}
      />
    );
  };

  // SIP section
  const openAddSip = () => {
    openModal(<SipForm onClose={closeModal} />);
  };

  const openEditSip = (sipId: string) => {
    const sip = state.sips.find(s => s.id === sipId);
    if (sip) openModal(<SipForm editSip={sip} onClose={closeModal} />);
  };

  return (
    <div className="screen active">
      <div className="screen-header">
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/more')}>&larr; Back</button>
        <div className="screen-title">Budgets</div>
        <div />
      </div>

      {/* Monthly Budget Overview */}
      <div className="card mb-4 p-4 cursor-pointer" onClick={openMonthlyBudgetModal}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold">Monthly Budget</span>
          <span className="text-sm font-bold">{formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}</span>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '100%', height: 26, background: 'var(--bg-hover)',
            borderRadius: 13, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 13,
              width: `${Math.max(budgetPct, 2)}%`,
              background: budgetPct >= 100 ? 'var(--red)' : budgetPct >= 80 ? 'var(--amber)' : 'var(--green)',
              transition: 'width 0.6s ease',
            }} />
          </div>
          <span style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: '0.72rem', fontWeight: 700,
            color: budgetPct > 55 ? '#fff' : 'var(--text-secondary)',
          }}>
            {Math.round(budgetPct)}%
          </span>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-[var(--text-muted)]">{Math.round(budgetPct)}% used</span>
          <span className="text-xs text-[var(--text-muted)]">
            {dailyBudget > 0 ? `${formatCurrency(dailyBudget)}/day for ${daysRemaining} days` : ''}
          </span>
        </div>
      </div>

      {/* Category Budgets */}
      <div className="section-header">
        <div className="section-title">Category Budgets</div>
        <button className="btn btn-sm btn-primary" onClick={openAddBudget}>+ Add</button>
      </div>

      {budgetRows.map(b => {
        const color = b.pct >= 100 ? 'var(--red)' : b.pct >= 80 ? 'var(--amber)' : 'var(--green)';
        return (
          <div key={b.categoryId} className="budget-row" onClick={() => openEditBudget(b.categoryId, b.monthlyLimit)}>
            <div className="budget-header">
              <span className="text-sm font-semibold">{b.cat?.icon} {b.cat?.name}</span>
              <span className="text-sm font-bold" style={{ color }}>{formatCurrency(b.spent)}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '100%', height: 24, background: 'var(--bg-hover)',
                borderRadius: 12, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 12,
                  width: `${Math.max(Math.min(b.pct, 100), 2)}%`,
                  background: color, transition: 'width 0.6s ease',
                }} />
              </div>
              <span style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                fontSize: '0.7rem', fontWeight: 700,
                color: b.pct > 55 ? '#fff' : 'var(--text-secondary)',
              }}>
                {Math.round(b.pct)}%
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-[var(--text-muted)]">{formatCurrency(b.spent)} spent</span>
              <span className="text-xs text-[var(--text-muted)]">of {formatCurrency(b.monthlyLimit)}</span>
            </div>
          </div>
        );
      })}

      {budgetRows.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>No category budgets set yet</p>
        </div>
      )}

      {/* SIPs & Investments */}
      <div className="section-header mt-6">
        <div className="section-title">SIPs & Investments</div>
        <button className="btn btn-sm btn-primary" onClick={openAddSip}>+ Add</button>
      </div>

      {state.sips.map(sip => (
        <div key={sip.id} className="card mb-3 p-4 cursor-pointer" onClick={() => openEditSip(sip.id)}>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-semibold text-sm">{sip.name}</div>
              <div className="text-xs text-[var(--text-muted)]">
                {sip.frequency} &middot; Day {sip.sipDate} &middot; {sip.type.toUpperCase()}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-sm">{formatCurrency(sip.amount)}</div>
              <span className={`chip ${sip.active ? 'chip-green' : 'chip-red'}`}>
                {sip.active ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>
        </div>
      ))}

      {state.sips.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">💹</div>
          <p>No SIPs or investments tracked yet</p>
        </div>
      )}
    </div>
  );
}

// Sub-component: Budget Amount Form
function BudgetAmountForm({ title, initialValue, onSave, onClose, onDelete }: {
  title: string; initialValue: string; onSave: (val: number) => void; onClose: () => void; onDelete?: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <div>
      <div className="modal-header">
        <div className="modal-title">{title}</div>
        <button className="modal-close" onClick={onClose}>&times;</button>
      </div>
      <div className="form-group">
        <label className="form-label">Amount</label>
        <input type="number" className="form-control" value={value} onChange={e => setValue(e.target.value)}
          step="100" min="0" autoFocus />
      </div>
      <div className="flex gap-2.5">
        {onDelete && <button className="btn btn-danger flex-1" onClick={onDelete}>Delete</button>}
        <button className="btn btn-primary flex-1" onClick={() => {
          const v = parseFloat(value);
          if (!v || v <= 0) { toast.error('Enter a valid amount'); return; }
          onSave(v);
        }}>Save</button>
      </div>
    </div>
  );
}

// Sub-component: Add Budget Form
function AddBudgetForm({ categories, onSave, onClose }: {
  categories: { id: string; icon: string; name: string }[];
  onSave: (catId: string, limit: number) => void; onClose: () => void;
}) {
  const [catId, setCatId] = useState(categories[0]?.id || '');
  const [limit, setLimit] = useState('');
  return (
    <div>
      <div className="modal-header">
        <div className="modal-title">Add Category Budget</div>
        <button className="modal-close" onClick={onClose}>&times;</button>
      </div>
      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-control" value={catId} onChange={e => setCatId(e.target.value)}>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Monthly Limit</label>
        <input type="number" className="form-control" placeholder="e.g. 5000" value={limit}
          onChange={e => setLimit(e.target.value)} step="100" min="0" />
      </div>
      <button className="btn btn-primary w-full" onClick={() => {
        const v = parseFloat(limit);
        if (!v || v <= 0) { toast.error('Enter a valid amount'); return; }
        onSave(catId, v);
      }}>Save</button>
    </div>
  );
}

// Sub-component: SIP Form
function SipForm({ editSip, onClose }: {
  editSip?: { id: string; name: string; amount: number; frequency: string; sipDate: number; type: 'sip' | 'investment'; accountId: string; active: boolean };
  onClose: () => void;
}) {
  const state = useStore();
  const { confirmModal } = useModal();

  const [name, setName] = useState(editSip?.name || '');
  const [amount, setAmount] = useState(editSip?.amount?.toString() || '');
  const [frequency, setFrequency] = useState(editSip?.frequency || 'monthly');
  const [sipDate, setSipDate] = useState(editSip?.sipDate?.toString() || '1');
  const [sipType, setSipType] = useState<'sip' | 'investment'>(editSip?.type || 'sip');
  const [accountId, setAccountId] = useState(editSip?.accountId || state.accounts[0]?.id || '');

  const handleSave = () => {
    if (!name.trim()) { toast.error('Enter SIP name'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }

    const data = {
      name: name.trim(), amount: amt, frequency, sipDate: parseInt(sipDate) || 1,
      type: sipType, accountId, active: editSip?.active ?? true,
    };

    if (editSip) {
      state.updateSip(editSip.id, data);
      toast.success('SIP updated');
    } else {
      state.addSip(data);
      toast.success('SIP added');
    }
    onClose();
  };

  return (
    <div>
      <div className="modal-header">
        <div className="modal-title">{editSip ? 'Edit SIP' : 'Add SIP'}</div>
        <button className="modal-close" onClick={onClose}>&times;</button>
      </div>
      <div className="form-group">
        <label className="form-label">Name</label>
        <input type="text" className="form-control" placeholder="e.g. Nifty 50 Index Fund" value={name}
          onChange={e => setName(e.target.value)} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Amount</label>
          <input type="number" className="form-control" placeholder="0" value={amount}
            onChange={e => setAmount(e.target.value)} step="100" min="0" />
        </div>
        <div className="form-group">
          <label className="form-label">SIP Date</label>
          <input type="number" className="form-control" placeholder="1" value={sipDate}
            onChange={e => setSipDate(e.target.value)} min="1" max="31" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Frequency</label>
          <select className="form-control" value={frequency} onChange={e => setFrequency(e.target.value)}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <select className="form-control" value={sipType} onChange={e => setSipType(e.target.value as 'sip' | 'investment')}>
            <option value="sip">SIP</option>
            <option value="investment">Investment</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Account</label>
        <select className="form-control" value={accountId} onChange={e => setAccountId(e.target.value)}>
          {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div className="flex gap-2.5">
        {editSip && (
          <>
            <button className="btn btn-danger flex-1" onClick={() => {
              confirmModal({
                title: 'Delete SIP', message: `Delete "${editSip.name}"?`,
                confirmLabel: 'Delete', danger: true,
                onConfirm: () => { state.deleteSip(editSip.id); toast.success('SIP deleted'); onClose(); },
              });
            }}>Delete</button>
            <button className="btn btn-secondary flex-1" onClick={() => {
              state.toggleSip(editSip.id);
              toast.success(editSip.active ? 'SIP paused' : 'SIP resumed');
              onClose();
            }}>{editSip.active ? 'Pause' : 'Resume'}</button>
          </>
        )}
        <button className="btn btn-primary flex-1" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
