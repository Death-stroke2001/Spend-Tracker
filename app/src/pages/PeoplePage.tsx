import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, getPersonBalance } from '../store';
import { formatCurrency } from '../lib/format';
import { useModal } from '../components/ui/Modal';
import toast from 'react-hot-toast';

const avatarColors = ['', 'av-green', 'av-amber', 'av-red', 'av-blue'];

export default function PeoplePage() {
  const state = useStore();
  const navigate = useNavigate();
  const { openModal, closeModal } = useModal();

  const peopleWithBalance = useMemo(() => {
    return state.people.map((p, i) => ({
      ...p,
      balance: getPersonBalance(state, p.id),
      avatarClass: avatarColors[i % avatarColors.length],
    }));
  }, [state]);

  const summary = useMemo(() => {
    let theyOwe = 0;
    let youOwe = 0;
    peopleWithBalance.forEach(p => {
      if (p.balance > 0) theyOwe += p.balance;
      else if (p.balance < 0) youOwe += Math.abs(p.balance);
    });
    return { theyOwe, youOwe, net: theyOwe - youOwe };
  }, [peopleWithBalance]);

  const handleAddPerson = () => {
    openModal(
      <div>
        <div className="modal-header">
          <div className="modal-title">Add Person</div>
          <button className="modal-close" onClick={closeModal}>&times;</button>
        </div>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input type="text" className="form-control" placeholder="Person name" id="add-person-input"
            autoFocus />
        </div>
        <button className="btn btn-primary w-full" onClick={() => {
          const input = document.getElementById('add-person-input') as HTMLInputElement;
          const name = input?.value?.trim();
          if (!name) { toast.error('Enter a name'); return; }
          state.addPerson(name);
          toast.success(`${name} added`);
          closeModal();
        }}>Save</button>
      </div>
    );
  };

  return (
    <div className="screen active">
      <div className="screen-header">
        <div className="screen-title">People</div>
        <button className="btn btn-sm btn-primary" onClick={handleAddPerson}>+ Add</button>
      </div>

      {/* Summary Pills */}
      <div className="stat-pills mb-4">
        <div className="stat-pill">
          <div className="sp-label">They Owe</div>
          <div className="sp-value text-[var(--green)]">{formatCurrency(summary.theyOwe)}</div>
        </div>
        <div className="stat-pill">
          <div className="sp-label">You Owe</div>
          <div className="sp-value text-[var(--red)]">{formatCurrency(summary.youOwe)}</div>
        </div>
        <div className="stat-pill">
          <div className="sp-label">Net</div>
          <div className={`sp-value ${summary.net >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
            {formatCurrency(Math.abs(summary.net))}
          </div>
        </div>
      </div>

      {/* People List */}
      {peopleWithBalance.map(person => (
        <div key={person.id} className="person-row" onClick={() => navigate(`/people/${person.id}`)}>
          <div className="flex items-center gap-3">
            <div className={`person-avatar ${person.avatarClass}`}>
              {person.name.charAt(0).toUpperCase()}
            </div>
            <div className="font-semibold">{person.name}</div>
          </div>
          <div className={`person-balance-badge ${person.balance > 0 ? 'owes' : person.balance < 0 ? 'owed' : 'settled'}`}>
            {person.balance > 0 ? `+${formatCurrency(person.balance)}` :
             person.balance < 0 ? `-${formatCurrency(Math.abs(person.balance))}` :
             'Settled'}
          </div>
        </div>
      ))}

      {state.people.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>No people added yet. Add someone to track shared expenses.</p>
        </div>
      )}
    </div>
  );
}
