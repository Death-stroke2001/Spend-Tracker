import { useStore } from '../store';

export function formatCurrency(amount: number, currencySymbol?: string): string {
  const sym = currencySymbol ?? useStore.getState().settings.currency ?? '₹';
  const neg = amount < 0;
  const abs = Math.abs(amount);
  const parts = abs.toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];
  // Indian number formatting
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    intPart = formatted + ',' + last3;
  }
  return (neg ? '-' : '') + sym + intPart + '.' + decPart;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
