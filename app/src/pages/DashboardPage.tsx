import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, getNetWorth, getMonthStats, getPendingAmounts, getCategorySpending, getCategoryById, isDue } from '../store';
import { formatCurrency } from '../lib/format';
import { todayStr, getMonthStr } from '../lib/utils';
import { CHART_COLORS } from '../lib/constants';
import { useModal } from '../components/ui/Modal';
import TransactionForm from '../components/transactions/TransactionForm';
import TransactionItem from '../components/transactions/TransactionItem';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import type { TransactionType } from '../types';

// Active shape renderer for pie chart hover
function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
  return (
    <g>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))', transition: 'all 0.2s ease' }}
      />
      <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase' as const }}>
        {payload.fullName || payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: '1rem', fontWeight: 800 }}>
        {formatCurrency(value || payload.amount)}
      </text>
    </g>
  );
}

export default function DashboardPage() {
  const state = useStore();
  const navigate = useNavigate();
  const { openModal } = useModal();
  const [activeSpendIdx, setActiveSpendIdx] = useState(-1);
  const today = todayStr();
  const currentMonth = getMonthStr(today);

  const netWorth = useMemo(() => getNetWorth(state), [state]);
  const monthStats = useMemo(() => getMonthStats(state, currentMonth), [state, currentMonth]);
  const pending = useMemo(() => getPendingAmounts(state), [state]);
  const catSpending = useMemo(() => getCategorySpending(state, currentMonth), [state, currentMonth]);

  // Category spending for donut chart
  const categoryData = useMemo(() => {
    return Object.entries(catSpending)
      .map(([catId, amount]) => {
        const cat = getCategoryById(state, catId);
        return { catId, amount, cat, name: cat?.icon || '?', fullName: cat?.name || 'Other' };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [catSpending, state]);

  const totalCatSpend = useMemo(() => categoryData.reduce((s, c) => s + c.amount, 0), [categoryData]);

  // Budget overview with rings
  const budgetRings = useMemo(() => {
    return state.budgets.map(b => {
      const spent = catSpending[b.categoryId] || 0;
      const pct = b.monthlyLimit > 0 ? Math.min((spent / b.monthlyLimit) * 100, 100) : 0;
      const cat = getCategoryById(state, b.categoryId);
      return { ...b, spent, pct, cat, remaining: b.monthlyLimit - spent };
    });
  }, [state.budgets, catSpending, state]);

  // Recurring due today
  const recurringDue = useMemo(() => {
    return state.transactions.filter(t => isDue(t, today, state.recurringLog));
  }, [state.transactions, today, state.recurringLog]);

  // Upcoming recurring (next 7 days)
  const upcomingRecurring = useMemo(() => {
    const upcoming: { txn: typeof state.transactions[0]; dateStr: string }[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      state.transactions.forEach(t => {
        if (isDue(t, ds, state.recurringLog)) {
          upcoming.push({ txn: t, dateStr: ds });
        }
      });
    }
    return upcoming;
  }, [state.transactions, state.recurringLog]);

  // Recent 10 transactions
  const recentTxns = useMemo(() => {
    return [...state.transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
      .slice(0, 10);
  }, [state.transactions]);

  // Over-budget alerts
  const overBudget = useMemo(() => {
    return budgetRings.filter(b => b.spent > b.monthlyLimit);
  }, [budgetRings]);

  // Top 3 accounts
  const topAccounts = useMemo(() => {
    return [...state.accounts]
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 3);
  }, [state.accounts]);

  const openTxnForm = useCallback((type?: TransactionType) => {
    openModal(<TransactionForm defaultType={type} />);
  }, [openModal]);

  const editTxn = useCallback((txn: typeof state.transactions[0]) => {
    openModal(<TransactionForm editTxn={txn} />);
  }, [openModal]);

  const confirmRecurring = state.confirmRecurring;
  const skipRecurring = state.skipRecurring;

  // SVG progress ring helper
  const renderRing = (pct: number, color: string, size = 52) => {
    const radius = (size - 12) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--bg-hover)" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
    );
  };

  return (
    <div className="screen active">
      {/* Net Worth Banner */}
      <div className="nw-banner">
        <div className="label">Total Balance</div>
        <div className="value">{formatCurrency(netWorth.net)}</div>
        <div className="nw-sub">
          <div>
            <div className="nw-sub-label">Assets</div>
            <div className="nw-sub-val">{formatCurrency(netWorth.assets)}</div>
          </div>
          <div>
            <div className="nw-sub-label">Liabilities</div>
            <div className="nw-sub-val">{formatCurrency(netWorth.liabilities)}</div>
          </div>
        </div>
      </div>

      {/* Income / Expense Stats */}
      <div className="inline-stats">
        <div className="inline-stat">
          <div className="inline-stat-icon income-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </div>
          <div className="inline-stat-info">
            <div className="inline-stat-label">Income</div>
            <div className="inline-stat-val text-[var(--green)]">{formatCurrency(monthStats.income)}</div>
          </div>
        </div>
        <div className="inline-stat">
          <div className="inline-stat-icon expense-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          </div>
          <div className="inline-stat-info">
            <div className="inline-stat-label">Expenses</div>
            <div className="inline-stat-val text-[var(--red)]">{formatCurrency(monthStats.expenses)}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        {([
          { type: 'expense' as TransactionType, icon: '💸', label: 'Expense' },
          { type: 'income' as TransactionType, icon: '💰', label: 'Income' },
          { type: 'transfer' as TransactionType, icon: '🔄', label: 'Transfer' },
          { type: 'group_split' as TransactionType, icon: '👥', label: 'Split' },
        ]).map(qa => (
          <button key={qa.type} className="quick-action" onClick={() => openTxnForm(qa.type)}>
            <span className="quick-action-icon">{qa.icon}</span>
            <span>{qa.label}</span>
          </button>
        ))}
      </div>

      {/* Pending Amounts Strip */}
      {(pending.toReceive > 0 || pending.toPay > 0) && (
        <div className="pending-strip">
          <div className="pending-card receive" onClick={() => navigate('/people')}>
            <span className="pc-label text-[var(--green)]">To Receive</span>
            <span className="pc-value text-[var(--green)]">{formatCurrency(pending.toReceive)}</span>
          </div>
          <div className="pending-card pay" onClick={() => navigate('/people')}>
            <span className="pc-label text-[var(--red)]">To Pay</span>
            <span className="pc-value text-[var(--red)]">{formatCurrency(pending.toPay)}</span>
          </div>
        </div>
      )}

      {/* Over-budget Alerts */}
      {overBudget.map(b => (
        <div key={b.categoryId} className="alert-banner alert-warning mb-3">
          <span>&#9888;&#65039;</span>
          <span>{b.cat?.icon} {b.cat?.name}: Over budget by {formatCurrency(b.spent - b.monthlyLimit)}</span>
        </div>
      ))}

      {/* Accounts Quick View */}
      {topAccounts.length > 0 && (
        <div className="card mb-4">
          <div className="section-header">
            <div className="section-title">Accounts</div>
            <button className="section-link" onClick={() => navigate('/accounts')}>See All</button>
          </div>
          <div className="flex flex-col gap-3">
            {topAccounts.map(acct => (
              <div key={acct.id} className="flex items-center justify-between cursor-pointer py-1"
                onClick={() => navigate(`/accounts/${acct.id}`)}>
                <div className="flex items-center gap-3">
                  <div className={`acct-list-icon ${acct.type}`}>
                    {acct.type === 'bank' ? '🏦' : acct.type === 'credit_card' ? '💳' : acct.type === 'wallet' ? '📱' : acct.type === 'cash' ? '💵' : '🏠'}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{acct.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{acct.type === 'credit_card' ? 'Credit Card' : acct.type === 'bank' ? 'Bank' : acct.type === 'wallet' ? 'Wallet' : acct.type}</div>
                  </div>
                </div>
                <div className={`font-bold text-sm ${acct.balance >= 0 ? '' : 'text-[var(--red)]'}`}>
                  {formatCurrency(acct.balance)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recurring Due Today */}
      {recurringDue.length > 0 && (
        <div className="card mb-4">
          <div className="section-header">
            <div className="section-title">Due Today</div>
          </div>
          {recurringDue.map(txn => {
            const cat = getCategoryById(state, txn.categoryId);
            return (
              <div key={txn.id} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-b-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{cat?.icon || '🔄'}</span>
                  <div>
                    <div className="font-semibold text-sm">{txn.merchant || cat?.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">{formatCurrency(txn.amount)}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-sm btn-primary" onClick={() => { confirmRecurring(txn.id); }}>
                    Confirm
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={() => { skipRecurring(txn.id); }}>
                    Skip
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Spending - Donut Chart */}
      {categoryData.length > 0 && (
        <div className="card mb-4">
          <div className="section-header">
            <div className="section-title">Spending Split</div>
            <button className="section-link" onClick={() => navigate('/reports')}>View All</button>
          </div>
          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="amount"
                  {...{ activeIndex: activeSpendIdx, activeShape: renderActiveShape } as any}
                  onMouseEnter={(_, index) => setActiveSpendIdx(index)}
                  onMouseLeave={() => setActiveSpendIdx(-1)}
                  stroke="none"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} style={{ cursor: 'pointer' }} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label - hidden when hovering a segment */}
            {activeSpendIdx < 0 && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                textAlign: 'center', pointerEvents: 'none',
              }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{formatCurrency(totalCatSpend)}</div>
              </div>
            )}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 justify-center">
            {categoryData.map((item, i) => (
              <div key={item.catId} className="flex items-center gap-1.5" style={{ fontSize: '0.75rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                <span className="text-[var(--text-secondary)]">{item.cat?.icon} {item.fullName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Budget Overview with Progress Rings */}
      {budgetRings.length > 0 && (
        <div className="card mb-4">
          <div className="section-header">
            <div className="section-title">Budget Overview</div>
            <button className="section-link" onClick={() => navigate('/budgets')}>View All</button>
          </div>
          {budgetRings.map(b => {
            const color = b.pct >= 100 ? 'var(--red)' : b.pct >= 80 ? 'var(--amber)' : 'var(--green)';
            return (
              <div key={b.categoryId} className="budget-ring-row">
                <div className="budget-ring">
                  {renderRing(b.pct, color)}
                  <div className="budget-ring-pct" style={{ color }}>{Math.round(b.pct)}%</div>
                </div>
                <div className="budget-ring-info">
                  <div className="budget-ring-title">{b.cat?.icon} {b.cat?.name}</div>
                  <div className="budget-ring-sub">
                    {formatCurrency(b.spent)} of {formatCurrency(b.monthlyLimit)}
                  </div>
                </div>
                <div className="budget-ring-remaining">
                  <div className={`val ${b.remaining >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                    {formatCurrency(Math.abs(b.remaining))}
                  </div>
                  <div className="lbl">{b.remaining >= 0 ? 'Left' : 'Over'}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upcoming Recurring */}
      {upcomingRecurring.length > 0 && (
        <div className="card mb-4">
          <div className="section-header">
            <div className="section-title">Upcoming</div>
          </div>
          {upcomingRecurring.map(({ txn, dateStr }, i) => {
            const cat = getCategoryById(state, txn.categoryId);
            const d = new Date(dateStr + 'T00:00:00');
            return (
              <div key={`${txn.id}-${dateStr}-${i}`} className="timeline-item">
                <div className="timeline-date">
                  <div className="day">{d.getDate()}</div>
                  <div className="month">{d.toLocaleString('en', { month: 'short' })}</div>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{txn.merchant || cat?.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{cat?.icon} {cat?.name}</div>
                </div>
                <div className="font-bold text-sm">{formatCurrency(txn.amount)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Transactions */}
      {recentTxns.length > 0 && (
        <div className="card mb-4">
          <div className="section-header">
            <div className="section-title">Recent Activity</div>
            <button className="section-link" onClick={() => navigate('/transactions')}>See All</button>
          </div>
          {recentTxns.map(txn => (
            <TransactionItem key={txn.id} txn={txn} onClick={editTxn} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {state.transactions.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>No transactions yet. Tap + to add your first transaction.</p>
        </div>
      )}
    </div>
  );
}
