import { Role, SavingsType, TransactionType } from './models';

export const savingsLabels: Record<SavingsType, string> = {
  POKOK: 'Simpanan Pokok',
  WAJIB: 'Simpanan Wajib',
  SUKARELA: 'Simpanan Sukarela',
};

export const savingsOrder: SavingsType[] = ['POKOK', 'WAJIB', 'SUKARELA'];

export const transactionLabels: Record<TransactionType, string> = {
  DEPOSIT: 'Setoran',
  WITHDRAWAL: 'Penarikan',
  LOAN_DISBURSEMENT: 'Pencairan pinjaman',
  INSTALLMENT_PAYMENT: 'Pembayaran angsuran',
};

const statusLabels: Record<string, string> = {
  APPLIED: 'Menunggu persetujuan',
  APPROVED: 'Disetujui',
  DISBURSED: 'Berjalan',
  COMPLETED: 'Selesai',
  REJECTED: 'Ditolak',
  PENDING: 'Belum dibayar',
  PAID: 'Lunas',
};

export function statusLabel(status: string): string {
  return statusLabels[status] ?? status;
}

export function badgeClass(status: string): string {
  switch (status) {
    case 'APPLIED':
      return 'badge badge-warn';
    case 'APPROVED':
      return 'badge badge-info';
    case 'DISBURSED':
      return 'badge badge-indigo';
    case 'COMPLETED':
    case 'PAID':
      return 'badge badge-success';
    case 'REJECTED':
      return 'badge badge-danger';
    default:
      return 'badge badge-muted';
  }
}

export function roleLabel(role: Role | null | undefined): string {
  switch (role) {
    case 'ADMIN':
      return 'Pengurus';
    case 'TELLER':
      return 'Teller';
    case 'MEMBER':
      return 'Anggota';
    default:
      return 'Tamu';
  }
}

/** Turns a trimmed input into null so optional backend fields stay empty, not "". */
export function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

export const phoneCountries = [
  { dial: '+62', name: 'Indonesia' },
  { dial: '+60', name: 'Malaysia' },
  { dial: '+65', name: 'Singapura' },
  { dial: '+1', name: 'Amerika Serikat' },
  { dial: '+44', name: 'Inggris' },
  { dial: '+91', name: 'India' },
  { dial: '+81', name: 'Jepang' },
  { dial: '+86', name: 'Tiongkok' },
];
