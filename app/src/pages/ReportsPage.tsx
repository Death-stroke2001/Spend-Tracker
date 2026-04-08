import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, getCategoryById, getAccountById } from '../store';
import { formatCurrency } from '../lib/format';
import { CHART_COLORS } from '../lib/constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';

const TABS = ['Monthly', 'Category', 'Merchants', 'Accounts'];

// Active shape renderer for pie chart hover - expands the segment and shows amount
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
      <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase' as const }}>
        {payload.fullName || payload.name}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-primary)" style={{ fontSize: '1.1rem', fontWeight: 800 }}>
        {formatCurrency(value || payload.amount)}
      </text>
    </g>
  );
}

export default function ReportsPage() {
  const state = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [activeCatIdx, setActiveCatIdx] = useState(-1);
  const [activeAcctIdx, setActiveAcctIdx] = useState(-1);

  // Monthly data (last 6 months)
  const monthlyData = useMemo(() => {
    const months: { month: string; income: number; expenses: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en', { month: 'short', year: '2-digit' });
      let income = 0;
      let expenses = 0;
      state.transactions.forEach(t => {
        if (t.date.substring(0, 7) !== monthStr) return;
        if (t.type === 'income') income += t.amount;
        else if (t.type === 'expense') expenses += t.amount;
        else if (t.type === 'group_split' && t.splitDetails) expenses += t.splitDetails.myShare || 0;
      });
      months.push({ month: label, income, expenses });
    }
    return months;
  }, [state.transactions]);

  // Category spending (current month)
  const categoryData = useMemo(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const spending: Record<string, number> = {};
    state.transactions.forEach(t => {
      if (t.date.substring(0, 7) !== monthStr) return;
      if (t.type === 'expense') {
        spending[t.categoryId] = (spending[t.categoryId] || 0) + t.amount;
      } else if (t.type === 'group_split' && t.splitDetails) {
        spending[t.categoryId] = (spending[t.categoryId] || 0) + (t.splitDetails.myShare || 0);
      }
    });
    return Object.entries(spending)
      .map(([catId, amount]) => {
        const cat = getCategoryById(state, catId);
        return { name: cat?.icon || '?', fullName: cat?.name || 'Unknown', icon: cat?.icon || '?', value: amount };
      })
      .sort((a, b) => b.value - a.value);
  }, [state]);

  const totalCatSpend = useMemo(() => categoryData.reduce((s, c) => s + c.value, 0), [categoryData]);

  // Top 15 merchants - only count expense-like types
  const merchantData = useMemo(() => {
    const merchants: Record<string, { count: number; total: number; catId: string }> = {};
    state.transactions.forEach(t => {
      if (!t.merchant) return;
      // Only count actual spending types, not transfers/income
      if (t.type !== 'expense' && t.type !== 'group_split' && t.type !== 'lent') return;
      const amt = t.type === 'group_split' && t.splitDetails ? t.splitDetails.myShare || 0 : t.amount;
      if (!merchants[t.merchant]) merchants[t.merchant] = { count: 0, total: 0, catId: t.categoryId };
      merchants[t.merchant].count++;
      merchants[t.merchant].total += amt;
    });
    return Object.entries(merchants)
      .map(([name, data]) => {
        const cat = getCategoryById(state, data.catId);
        return { name, icon: cat?.icon || '💸', ...data };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [state.transactions, state]);

  const maxMerchantAmt = merchantData.length > 0 ? merchantData[0].total : 1;

  // Account spending - exclude transfers and income
  const accountData = useMemo(() => {
    const accounts: Record<string, number> = {};
    state.transactions.forEach(t => {
      // Only count actual outflows that are spending (not transfers which are just moving money)
      if (t.type === 'expense' || t.type === 'lent') {
        accounts[t.fromAccountId] = (accounts[t.fromAccountId] || 0) + t.amount;
      } else if (t.type === 'group_split' && t.splitDetails) {
        accounts[t.fromAccountId] = (accounts[t.fromAccountId] || 0) + (t.splitDetails.myShare || 0);
      }
      // Transfers are NOT spending - money is just moving between accounts
    });
    return Object.entries(accounts)
      .map(([accId, amount]) => {
        const acc = getAccountById(state, accId);
        return { name: acc?.name || 'Unknown', type: acc?.type || 'bank', amount };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [state]);

  const totalAcctSpend = useMemo(() => accountData.reduce((s, a) => s + a.amount, 0), [accountData]);

  return (
    <div className="screen active">
      <div className="screen-header">
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/more')}>&larr; Back</button>
        <div className="screen-title">Reports</div>
        <div />
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map((tab, i) => (
          <button key={tab} className={`tab ${activeTab === i ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}>{tab}</button>
        ))}
      </div>

      {/* Monthly Tab */}
      {activeTab === 0 && (
        <div className="card p-4">
          <div className="section-title mb-4">Income vs Expenses (6 months)</div>
          {monthlyData.some(d => d.income > 0 || d.expenses > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Bar dataKey="income" fill="var(--green)" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill="var(--red)" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state"><p>No data for the last 6 months</p></div>
          )}
        </div>
      )}

      {/* Category Tab - Donut with emoji labels */}
      {activeTab === 1 && (
        <div className="card p-4">
          <div className="section-title mb-4">Category Spending (This Month)</div>
          {categoryData.length > 0 ? (
            <>
              <div style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={600}
                      {...{ activeIndex: activeCatIdx, activeShape: renderActiveShape } as any}
                      onMouseEnter={(_, index) => setActiveCatIdx(index)}
                      onMouseLeave={() => setActiveCatIdx(-1)}
                      label={({ name, cx, cy, midAngle, outerRadius, index }: any) => {
                        if (index === activeCatIdx) return null;
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 18;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{ fontSize: '1.2rem' }}>
                            {name}
                          </text>
                        );
                      }}
                      labelLine={false}
                      stroke="none"
                    >
                      {categoryData.map((_, index) => (
                        <Cell
                          key={index}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center total - hidden when hovering a segment */}
                {activeCatIdx < 0 && (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center', pointerEvents: 'none',
                  }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>{formatCurrency(totalCatSpend)}</div>
                  </div>
                )}
              </div>
              {/* Legend list */}
              <div className="mt-4">
                {categoryData.map((item, i) => (
                  <div key={item.fullName} className="flex justify-between items-center py-2.5 border-b border-[var(--border)] last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                      <span className="text-sm">{item.icon} {item.fullName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold">{formatCurrency(item.value)}</span>
                      <span className="text-xs text-[var(--text-muted)] ml-2">
                        {totalCatSpend > 0 ? Math.round((item.value / totalCatSpend) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state"><p>No spending data this month</p></div>
          )}
        </div>
      )}

      {/* Merchants Tab - Cards with bars */}
      {activeTab === 2 && (
        <div className="card p-4">
          <div className="section-title mb-4">Top Merchants</div>
          {merchantData.length > 0 ? (
            <div className="flex flex-col gap-3">
              {merchantData.map((m, i) => {
                const pct = (m.total / maxMerchantAmt) * 100;
                return (
                  <div key={m.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: `${CHART_COLORS[i % CHART_COLORS.length]}18`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1rem', flexShrink: 0,
                        }}>{m.icon}</div>
                        <div>
                          <div className="text-sm font-semibold">{m.name}</div>
                          <div className="text-xs text-[var(--text-muted)]">{m.count} transaction{m.count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(m.total)}</span>
                    </div>
                    <div style={{
                      width: '100%', height: 4, background: 'var(--bg-hover)',
                      borderRadius: 2, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        width: `${pct}%`,
                        background: CHART_COLORS[i % CHART_COLORS.length],
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state"><p>No merchant data available</p></div>
          )}
        </div>
      )}

      {/* Accounts Tab - Donut chart */}
      {activeTab === 3 && (
        <div className="card p-4">
          <div className="section-title mb-4">Account-wise Spending</div>
          {accountData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={accountData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="amount"
                    animationBegin={0}
                    animationDuration={600}
                    {...{ activeIndex: activeAcctIdx, activeShape: renderActiveShape } as any}
                    onMouseEnter={(_, index) => setActiveAcctIdx(index)}
                    onMouseLeave={() => setActiveAcctIdx(-1)}
                    stroke="none"
                  >
                    {accountData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3">
                {accountData.map((a, i) => {
                  const pct = totalAcctSpend > 0 ? (a.amount / totalAcctSpend) * 100 : 0;
                  const acctIcon = a.type === 'bank' ? '🏦' : a.type === 'credit_card' ? '💳' : a.type === 'wallet' ? '📱' : a.type === 'cash' ? '💵' : '🏠';
                  return (
                    <div key={a.name} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                        <div className="flex items-center gap-2">
                          <span>{acctIcon}</span>
                          <span className="text-sm font-semibold">{a.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold">{formatCurrency(a.amount)}</span>
                        <span className="text-xs text-[var(--text-muted)] ml-2">{Math.round(pct)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="empty-state"><p>No spending data available</p></div>
          )}
        </div>
      )}
    </div>
  );
}
