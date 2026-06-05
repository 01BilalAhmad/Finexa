export function formatPKR(amount: number): string {
  if (amount >= 1000000) return `PKR ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `PKR ${(amount / 1000).toFixed(1)}K`;
  return `PKR ${amount.toLocaleString()}`;
}

export function formatPKRFull(amount: number): string {
  return `PKR ${amount.toLocaleString('en-PK')}`;
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

export function getDayName(date = new Date()): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

export function getCreditUsage(balance: number, creditLimit: number): number {
  if (creditLimit <= 0) return 0;
  return Math.min(balance / creditLimit, 1);
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function generateLocalId(prefix = 'local'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
