import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useModal } from '../components/ui/Modal';
import toast from 'react-hot-toast';
import SheetsSetup from '../auth/LoginPage';

export default function SettingsPage() {
  const state = useStore();
  const navigate = useNavigate();
  const { openModal, closeModal, confirmModal } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTheme = () => {
    const newTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
    state.updateSettings({ theme: newTheme });
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleCurrencyChange = (val: string) => {
    state.updateSettings({ currency: val });
  };

  const handleDefaultAccount = (accId: string) => {
    state.updateSettings({ defaultAccountId: accId || null });
  };

  const handleExport = () => {
    const json = state.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spendtracker-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        state.importData(ev.target?.result as string);
        toast.success('Data imported successfully');
      } catch {
        toast.error('Invalid data file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearData = () => {
    confirmModal({
      title: 'Clear All Data',
      message: 'This will permanently delete all your data. This action cannot be undone.',
      confirmLabel: 'Clear Everything',
      danger: true,
      onConfirm: () => {
        state.resetData();
        toast.success('All data cleared');
      },
    });
  };

  const openAddCategory = () => {
    openModal(<CategoryForm onClose={closeModal} />);
  };

  const openEditCategory = (cat: { id: string; icon: string; name: string; type: 'expense' | 'income' }) => {
    openModal(<CategoryForm editCat={cat} onClose={closeModal} />);
  };

  return (
    <div className="screen active">
      <div className="screen-header">
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/more')}>&larr; Back</button>
        <div className="screen-title">Settings</div>
        <div />
      </div>

      {/* Cloud Sync */}
      <div className="mb-4">
        <SheetsSetup />
      </div>

      {/* Theme Toggle */}
      <div className="card mb-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-sm">Theme</div>
            <div className="text-xs text-[var(--text-muted)]">{state.settings.theme === 'dark' ? 'Dark mode' : 'Light mode'}</div>
          </div>
          <button className={`toggle ${state.settings.theme === 'dark' ? 'active' : ''}`} onClick={toggleTheme} />
        </div>
      </div>

      {/* Currency */}
      <div className="card mb-4 p-4">
        <div className="form-group mb-0">
          <label className="form-label">Currency Symbol</label>
          <input type="text" className="form-control" value={state.settings.currency}
            onChange={e => handleCurrencyChange(e.target.value)} maxLength={5} />
        </div>
      </div>

      {/* Default Account */}
      <div className="card mb-4 p-4">
        <div className="form-group mb-0">
          <label className="form-label">Default Account</label>
          <select className="form-control" value={state.settings.defaultAccountId || ''}
            onChange={e => handleDefaultAccount(e.target.value)}>
            <option value="">None</option>
            {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {/* Categories */}
      <div className="card mb-4 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-sm">Categories</div>
          <button className="btn btn-sm btn-primary" onClick={openAddCategory}>+ Add</button>
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {state.categories.map(cat => (
            <div key={cat.id}
              className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-b-0 cursor-pointer"
              onClick={() => openEditCategory(cat)}>
              <div className="flex items-center gap-2">
                <span>{cat.icon}</span>
                <span className="text-sm">{cat.name}</span>
              </div>
              <span className={`chip ${cat.type === 'income' ? 'chip-green' : ''}`}>{cat.type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Management */}
      <div className="card mb-4 p-4">
        <div className="font-semibold text-sm mb-3">Data Management</div>
        <div className="flex flex-col gap-2">
          <button className="btn btn-secondary w-full" onClick={handleExport}>
            📤 Export Data (JSON)
          </button>
          <button className="btn btn-secondary w-full" onClick={() => fileInputRef.current?.click()}>
            📥 Import Data (JSON)
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button className="btn btn-danger w-full" onClick={handleClearData}>
            🗑 Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}

// Category Form sub-component
function CategoryForm({ editCat, onClose }: {
  editCat?: { id: string; icon: string; name: string; type: 'expense' | 'income' };
  onClose: () => void;
}) {
  const state = useStore();
  const { confirmModal } = useModal();

  const [icon, setIcon] = useState(editCat?.icon || '📌');
  const [name, setName] = useState(editCat?.name || '');
  const [type, setType] = useState<'expense' | 'income'>(editCat?.type || 'expense');

  const handleSave = () => {
    if (!name.trim()) { toast.error('Enter category name'); return; }

    if (editCat) {
      state.updateCategory(editCat.id, { icon, name: name.trim(), type });
      toast.success('Category updated');
    } else {
      state.addCategory({ icon, name: name.trim(), type });
      toast.success('Category added');
    }
    onClose();
  };

  return (
    <div>
      <div className="modal-header">
        <div className="modal-title">{editCat ? 'Edit Category' : 'Add Category'}</div>
        <button className="modal-close" onClick={onClose}>&times;</button>
      </div>

      <div className="form-row">
        <div className="form-group" style={{ maxWidth: 80 }}>
          <label className="form-label">Icon</label>
          <input type="text" className="form-control text-center" value={icon}
            onChange={e => setIcon(e.target.value)} maxLength={4} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">Name</label>
          <input type="text" className="form-control" placeholder="Category name" value={name}
            onChange={e => setName(e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Type</label>
        <select className="form-control" value={type} onChange={e => setType(e.target.value as 'expense' | 'income')}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>

      <div className="flex gap-2.5">
        {editCat && (
          <button className="btn btn-danger flex-1" onClick={() => {
            confirmModal({
              title: 'Delete Category', message: `Delete "${editCat.name}"?`,
              confirmLabel: 'Delete', danger: true,
              onConfirm: () => { state.deleteCategory(editCat.id); toast.success('Category deleted'); onClose(); },
            });
          }}>Delete</button>
        )}
        <button className="btn btn-primary flex-1" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
