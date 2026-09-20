const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const daysTo = (date) => (date ? Math.ceil((new Date(date + 'T00:00:00') - startOfToday()) / 86400000) : 99999);
export const isLow = (x) => Number(x.quantity) <= Number(x.minStock);
export const isExpiring = (x) => daysTo(x.expiryDate) <= 7;
export const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
export const dateFmt = (s) =>
  s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const buyQty = (x) => `Buy ${Math.max(0, Number(x.minStock) - Number(x.quantity)).toFixed(2)} ${x.unit}`;
export const todayISO = () => new Date().toISOString().slice(0, 10);

export function statusOf(x) {
  if (x.expiryDate && daysTo(x.expiryDate) < 0) return ['red', 'Expired'];
  if (isLow(x)) return ['orange', 'Low stock'];
  if (isExpiring(x)) return ['red', 'Expiring'];
  return ['green', 'Healthy'];
}
