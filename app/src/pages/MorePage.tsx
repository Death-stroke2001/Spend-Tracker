import { useNavigate } from 'react-router-dom';

const menuItems = [
  { path: '/smart-import', icon: '📲', title: 'Smart Import', desc: 'Auto-import from SMS & email', bg: 'var(--blue-bg)' },
  { path: '/budgets', icon: '📊', title: 'Budgets', desc: 'Track spending limits & SIPs', bg: 'var(--accent-bg)' },
  { path: '/emis', icon: '🏦', title: 'EMIs', desc: 'Manage loans & EMI payments', bg: 'var(--green-bg)' },
  { path: '/reports', icon: '📈', title: 'Reports', desc: 'Charts & spending insights', bg: 'var(--amber-bg)' },
  { path: '/splitwise', icon: '🔗', title: 'Splitwise', desc: 'Sync with Splitwise', bg: 'var(--red-bg)' },
  { path: '/settings', icon: '⚙️', title: 'Settings', desc: 'Theme, currency & data', bg: 'var(--accent-bg)' },
];

export default function MorePage() {
  const navigate = useNavigate();

  return (
    <div className="screen active">
      <div className="screen-header">
        <div className="screen-title">More</div>
      </div>

      <div className="flex flex-col gap-3">
        {menuItems.map(item => (
          <div key={item.path} className="more-item" onClick={() => navigate(item.path)}>
            <div className="more-item-icon" style={{ background: item.bg }}>
              {item.icon}
            </div>
            <div className="more-item-info">
              <div className="more-item-title">{item.title}</div>
              <div className="more-item-desc">{item.desc}</div>
            </div>
            <div className="more-item-arrow">&rsaquo;</div>
          </div>
        ))}
      </div>
    </div>
  );
}
