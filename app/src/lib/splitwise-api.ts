import type { SplitwiseExpense } from '../types';

const BASE_URL = 'https://secure.splitwise.com/api/v3.0';

interface SplitwiseUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface SplitwiseGroup {
  id: number;
  name: string;
}

interface SplitwiseRawExpense {
  id: number;
  description: string;
  cost: string;
  date: string;
  deleted_at: string | null;
  group_id: number;
  currency_code: string;
  category: { id: number; name: string };
  users: {
    user: { id: number; first_name: string; last_name: string };
    paid_share: string;
    owed_share: string;
    net_balance: string;
  }[];
}

async function apiFetch<T>(endpoint: string, apiKey: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Splitwise API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function getCurrentUser(apiKey: string): Promise<SplitwiseUser> {
  const data = await apiFetch<{ user: SplitwiseUser }>('/get_current_user', apiKey);
  return data.user;
}

export async function getGroups(apiKey: string): Promise<SplitwiseGroup[]> {
  const data = await apiFetch<{ groups: SplitwiseGroup[] }>('/get_groups', apiKey);
  return data.groups;
}

export async function syncSplitwiseExpenses(apiKey: string): Promise<SplitwiseExpense[]> {
  const [currentUser, groups, expenseData] = await Promise.all([
    getCurrentUser(apiKey),
    getGroups(apiKey),
    apiFetch<{ expenses: SplitwiseRawExpense[] }>('/get_expenses?limit=50&order=date', apiKey),
  ]);

  const groupMap = new Map<number, string>();
  groups.forEach(g => groupMap.set(g.id, g.name));

  const expenses: SplitwiseExpense[] = expenseData.expenses
    .filter(e => !e.deleted_at)
    .map(e => {
      const myUser = e.users.find(u => u.user.id === currentUser.id);
      const myPaid = parseFloat(myUser?.paid_share || '0');
      const myOwed = parseFloat(myUser?.owed_share || '0');
      const myBalance = parseFloat(myUser?.net_balance || '0');

      const paidBy = e.users
        .filter(u => parseFloat(u.paid_share) > 0)
        .map(u => ({
          name: `${u.user.first_name} ${u.user.last_name}`.trim(),
          amount: parseFloat(u.paid_share),
        }));

      const splitWith = e.users
        .filter(u => parseFloat(u.owed_share) > 0)
        .map(u => ({
          name: `${u.user.first_name} ${u.user.last_name}`.trim(),
          amount: parseFloat(u.owed_share),
        }));

      return {
        id: String(e.id),
        description: e.description,
        cost: parseFloat(e.cost),
        date: e.date.split('T')[0],
        groupId: e.group_id,
        groupName: groupMap.get(e.group_id) || 'Non-group',
        myBalance,
        myPaid,
        myOwed,
        paidBy,
        splitWith,
        category: e.category?.name || 'General',
        currencyCode: e.currency_code,
      };
    });

  return expenses;
}
