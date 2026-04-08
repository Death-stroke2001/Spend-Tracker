import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, getNetWorth } from '../store';
import { formatCurrency } from '../lib/format';
import { accountTypeLabels, accountTypeIcons } from '../lib/constants';
import { useModal } from '../components/ui/Modal';
import AccountForm from '../components/accounts/AccountForm';

export default function AccountsPage() {
  const state = useStore();
  const accounts = state.accounts;
  const { openModal } = useModal();
  const navigate = useNavigate();
  const nw = useMemo(() => getNetWorth(state), [state]);

  return (
    <div className="screen active">
      {/* Net Worth Summary */}
      <div className="nw-summary-card">
        <div className="nw-summary-label">Total Net Worth</div>
        <div className="nw-summary-value">{formatCurrency(nw.net)}</div>
        <div className="flex gap-6 mt-3" style={{ fontSize: '0.82rem', opacity: 0.9 }}>
          <div>
            <span style={{ opacity: 0.7 }}>Assets </span>
            <span className="font-bold">{formatCurrency(nw.assets)}</span>
          </div>
          <div>
            <span style={{ opacity: 0.7 }}>Liabilities </span>
            <span className="font-bold">{formatCurrency(nw.liabilities)}</span>
          </div>
        </div>
      </div>

      <div className="section-header">
        <div className="section-title">Linked Accounts</div>
        <button className="btn btn-sm btn-primary" onClick={() => openModal(<AccountForm />)}>
          + Add
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {accounts.map(acct => (
          <div key={acct.id} className="acct-list-item"
            onClick={() => navigate(`/accounts/${acct.id}`)}>
            <div className={`acct-list-icon ${acct.type}`}>
              {accountTypeIcons[acct.type]}
            </div>
            <div className="acct-list-info">
              <div className="acct-list-name">{acct.name}</div>
              <div className="acct-list-type">{accountTypeLabels[acct.type]}</div>
            </div>
            <div className={`acct-list-bal ${acct.balance < 0 ? 'text-[var(--red)]' : ''}`}>
              {formatCurrency(acct.balance)}
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🏦</div>
          <p>No accounts yet. Add your first account to get started.</p>
        </div>
      )}
    </div>
  );
}
