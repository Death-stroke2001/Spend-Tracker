import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { formatCurrency } from '../lib/format';
import { useModal } from '../components/ui/Modal';
import type { Emi } from '../types';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function EmisPage() {
  const state = useStore();
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();

  const summary = useMemo(() => {
    const active = state.emis.filter(e => e.active);
    const monthlyOutflow = active.reduce((s, e) => s + e.emiAmount, 0);
    const totalOutstanding = active.reduce((s, e) => s + e.emiAmount * e.remainingMonths, 0);
    const totalPaid = state.emis.reduce((s, e) => s + e.emiAmount * (e.tenureMonths - e.remainingMonths), 0);
    return { monthlyOutflow, totalOutstanding, totalPaid, activeCount: active.length };
  }, [state.emis]);

  // Check if this month's EMIs are done (day of month > all emi dates)
  const today = new Date();
  const currentDay = today.getDate();

  const openEmiForm = (emi?: Emi) => {
    openModal(<EmiForm editEmi={emi} onClose={closeModal} />);
  };

  // Motivational message based on progress
  const getMotivation = (emi: Emi) => {
    const paidMonths = emi.tenureMonths - emi.remainingMonths;
    const pct = emi.tenureMonths > 0 ? (paidMonths / emi.tenureMonths) * 100 : 0;
    const thisMonthDone = currentDay >= emi.emiDate;

    if (pct >= 95) return { msg: 'Almost there! Final stretch!', emoji: '🏁', color: 'var(--green)' };
    if (pct >= 75) return { msg: 'Home run! 3/4 done!', emoji: '🚀', color: 'var(--green)' };
    if (pct >= 50) return { msg: 'Halfway through! Keep going!', emoji: '💪', color: 'var(--accent)' };
    if (thisMonthDone) return { msg: "This month's EMI done!", emoji: '✅', color: 'var(--green)' };
    if (!thisMonthDone && currentDay >= emi.emiDate - 3) return { msg: `Due in ${emi.emiDate - currentDay} days`, emoji: '⏰', color: 'var(--amber)' };
    return { msg: 'On track', emoji: '📈', color: 'var(--text-muted)' };
  };

  // Overall status
  const allDoneThisMonth = state.emis.filter(e => e.active).every(e => currentDay >= e.emiDate);
  const totalProgress = useMemo(() => {
    if (state.emis.length === 0) return 0;
    const totalPaid = state.emis.reduce((s, e) => s + (e.tenureMonths - e.remainingMonths), 0);
    const totalTenure = state.emis.reduce((s, e) => s + e.tenureMonths, 0);
    return totalTenure > 0 ? (totalPaid / totalTenure) * 100 : 0;
  }, [state.emis]);

  // SVG ring
  const renderRing = (pct: number, color: string, size = 80) => {
    const radius = (size - 14) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--bg-hover)" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
    );
  };

  return (
    <div className="screen active">
      <div className="screen-header">
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/more')}>&larr; Back</button>
        <div className="screen-title">EMIs</div>
        <button className="btn btn-sm btn-primary" onClick={() => openEmiForm()}>+ Add</button>
      </div>

      {/* Status Banner */}
      {state.emis.length > 0 && (
        <div className="card mb-4" style={{ textAlign: 'center', padding: '24px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
              {renderRing(totalProgress, totalProgress >= 75 ? 'var(--green)' : 'var(--accent)')}
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{Math.round(totalProgress)}%</span>
              </div>
            </div>
          </div>
          {allDoneThisMonth ? (
            <div>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>🎉</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>All EMIs paid this month!</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Great job! You're on track.
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {formatCurrency(summary.monthlyOutflow)}<span style={{ fontWeight: 400, fontSize: '0.78rem', color: 'var(--text-muted)' }}> /month</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {summary.activeCount} active EMI{summary.activeCount !== 1 ? 's' : ''} &middot; {formatCurrency(summary.totalOutstanding)} outstanding
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div className="card" style={{ padding: '14px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Monthly</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--red)', marginTop: 4 }}>{formatCurrency(summary.monthlyOutflow)}</div>
        </div>
        <div className="card" style={{ padding: '14px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Paid</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--green)', marginTop: 4 }}>{formatCurrency(summary.totalPaid)}</div>
        </div>
        <div className="card" style={{ padding: '14px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Remaining</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--amber)', marginTop: 4 }}>{formatCurrency(summary.totalOutstanding)}</div>
        </div>
      </div>

      {/* EMI Cards */}
      {state.emis.map(emi => {
        const paidMonths = emi.tenureMonths - emi.remainingMonths;
        const progressPct = emi.tenureMonths > 0 ? (paidMonths / emi.tenureMonths) * 100 : 0;
        const motivation = getMotivation(emi);
        return (
          <div key={emi.id} className="card mb-3 cursor-pointer" style={{ padding: '18px' }} onClick={() => openEmiForm(emi)}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: emi.active ? 'var(--accent-bg)' : 'var(--bg-hover)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem',
                }}>
                  {emi.name.toLowerCase().includes('home') ? '🏠' :
                   emi.name.toLowerCase().includes('car') ? '🚗' :
                   emi.name.toLowerCase().includes('personal') ? '👤' : '🏦'}
                </div>
                <div>
                  <div className="font-bold text-sm">{emi.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{emi.lender} &middot; {emi.interestRate}% p.a.</div>
                </div>
              </div>
              <span className={`chip ${emi.active ? 'chip-green' : 'chip-red'}`}>
                {emi.active ? 'Active' : 'Paused'}
              </span>
            </div>

            <div className="flex justify-between items-baseline mb-3">
              <div>
                <span className="text-xs text-[var(--text-muted)]">EMI </span>
                <span className="font-bold">{formatCurrency(emi.emiAmount)}</span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                Day {emi.emiDate} &middot; {paidMonths}/{emi.tenureMonths} months
              </div>
            </div>

            {/* Thick progress bar with % */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <div style={{
                width: '100%', height: 22, background: 'var(--bg-hover)',
                borderRadius: 11, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 11,
                  width: `${Math.max(progressPct, 2)}%`,
                  background: progressPct >= 90 ? 'var(--green)' : progressPct >= 50 ? 'var(--accent)' : 'var(--blue)',
                  transition: 'width 0.6s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
                }} />
              </div>
              <span style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                fontSize: '0.68rem', fontWeight: 700, color: progressPct > 60 ? '#fff' : 'var(--text-secondary)',
              }}>
                {Math.round(progressPct)}%
              </span>
            </div>

            {/* Motivation line */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5" style={{ fontSize: '0.75rem', color: motivation.color }}>
                <span>{motivation.emoji}</span>
                <span style={{ fontWeight: 600 }}>{motivation.msg}</span>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {formatCurrency(emi.emiAmount * emi.remainingMonths)} left
              </span>
            </div>
          </div>
        );
      })}

      {state.emis.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏦</div>
          <p>No EMIs tracked yet. Add your loans and EMIs to manage them.</p>
        </div>
      )}
    </div>
  );
}

// EMI Form sub-component
function EmiForm({ editEmi, onClose }: { editEmi?: Emi; onClose: () => void }) {
  const state = useStore();
  const { confirmModal } = useModal();

  const [name, setName] = useState(editEmi?.name || '');
  const [lender, setLender] = useState(editEmi?.lender || '');
  const [totalAmount, setTotalAmount] = useState(editEmi?.totalAmount?.toString() || '');
  const [interestRate, setInterestRate] = useState(editEmi?.interestRate?.toString() || '');
  const [emiAmount, setEmiAmount] = useState(editEmi?.emiAmount?.toString() || '');
  const [emiDate, setEmiDate] = useState(editEmi?.emiDate?.toString() || '1');
  const [tenureMonths, setTenureMonths] = useState(editEmi?.tenureMonths?.toString() || '');
  const [remainingMonths, setRemainingMonths] = useState(editEmi?.remainingMonths?.toString() || '');
  const [startDate, setStartDate] = useState(editEmi?.startDate || '');
  const [accountId, setAccountId] = useState(editEmi?.accountId || state.accounts[0]?.id || '');

  const handleSave = () => {
    if (!name.trim()) { toast.error('Enter EMI name'); return; }
    const amt = parseFloat(emiAmount);
    if (!amt || amt <= 0) { toast.error('Enter valid EMI amount'); return; }

    const data = {
      name: name.trim(),
      lender: lender.trim(),
      totalAmount: parseFloat(totalAmount) || 0,
      interestRate: parseFloat(interestRate) || 0,
      emiAmount: amt,
      emiDate: parseInt(emiDate) || 1,
      tenureMonths: parseInt(tenureMonths) || 0,
      remainingMonths: parseInt(remainingMonths) || 0,
      startDate,
      accountId: accountId || null,
      active: editEmi?.active ?? true,
    };

    if (editEmi) {
      state.updateEmi(editEmi.id, data);
      toast.success('EMI updated');
    } else {
      state.addEmi(data);
      toast.success('EMI added');
    }
    onClose();
  };

  return (
    <div>
      <div className="modal-header">
        <div className="modal-title">{editEmi ? 'Edit EMI' : 'Add EMI'}</div>
        <button className="modal-close" onClick={onClose}>&times;</button>
      </div>
      <div className="form-group">
        <label className="form-label">Name</label>
        <input type="text" className="form-control" placeholder="e.g. Home Loan" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Lender</label>
        <input type="text" className="form-control" placeholder="e.g. HDFC Bank" value={lender} onChange={e => setLender(e.target.value)} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Loan Amount</label>
          <input type="number" className="form-control" placeholder="0" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} step="1000" min="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Interest Rate (%)</label>
          <input type="number" className="form-control" placeholder="0" value={interestRate} onChange={e => setInterestRate(e.target.value)} step="0.1" min="0" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">EMI Amount</label>
          <input type="number" className="form-control" placeholder="0" value={emiAmount} onChange={e => setEmiAmount(e.target.value)} step="100" min="0" />
        </div>
        <div className="form-group">
          <label className="form-label">EMI Date</label>
          <input type="number" className="form-control" placeholder="1" value={emiDate} onChange={e => setEmiDate(e.target.value)} min="1" max="31" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Tenure (months)</label>
          <input type="number" className="form-control" placeholder="0" value={tenureMonths} onChange={e => setTenureMonths(e.target.value)} min="0" />
        </div>
        <div className="form-group">
          <label className="form-label">Remaining (months)</label>
          <input type="number" className="form-control" placeholder="0" value={remainingMonths} onChange={e => setRemainingMonths(e.target.value)} min="0" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Account</label>
          <select className="form-control" value={accountId} onChange={e => setAccountId(e.target.value)}>
            <option value="">None</option>
            {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2.5 mt-4">
        {editEmi && (
          <>
            <button className="btn btn-danger flex-1" onClick={() => {
              confirmModal({
                title: 'Delete EMI', message: `Delete "${editEmi.name}"?`,
                confirmLabel: 'Delete', danger: true,
                onConfirm: () => { state.deleteEmi(editEmi.id); toast.success('EMI deleted'); onClose(); },
              });
            }}>Delete</button>
            <button className="btn btn-secondary flex-1" onClick={() => {
              state.toggleEmi(editEmi.id);
              toast.success(editEmi.active ? 'EMI paused' : 'EMI resumed');
              onClose();
            }}>{editEmi.active ? 'Pause' : 'Resume'}</button>
          </>
        )}
        <button className="btn btn-primary flex-1" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
