export type Role = 'ADMIN' | 'TELLER' | 'MEMBER';
export type SavingsType = 'POKOK' | 'WAJIB' | 'SUKARELA';
export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'LOAN_DISBURSEMENT' | 'INSTALLMENT_PAYMENT';
export type LoanStatus = 'APPLIED' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'COMPLETED';
export type InstallmentStatus = 'PENDING' | 'PAID';

export interface Session {
  token: string;
  username: string;
  fullName: string;
  role: Role;
}

export interface Member {
  id: number;
  memberNumber: string;
  fullName: string;
  nik: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  joinDate: string;
  status: string;
}

export interface MemberCreateRequest {
  fullName: string;
  memberNumber?: string | null;
  nik?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  username?: string | null;
  password?: string | null;
}

export interface SavingsAccount {
  type: SavingsType;
  balance: number;
}

export interface SavingsSummary {
  memberId: number;
  memberNumber: string;
  accounts: SavingsAccount[];
  total: number;
}

export interface SavingsDepositRequest {
  type: SavingsType;
  amount: number;
  note?: string | null;
}

export interface LedgerTransaction {
  id: number;
  type: TransactionType;
  savingsType: SavingsType | null;
  loanId: number | null;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface Loan {
  id: number;
  memberId: number;
  memberNumber: string;
  principal: number;
  interestRate: number;
  termMonths: number;
  status: LoanStatus;
  totalInterest: number;
  monthlyInstallment: number;
  totalRepayment: number;
  appliedAt: string;
  approvedAt: string | null;
  disbursedAt: string | null;
  notes: string | null;
}

export interface LoanCreateRequest {
  memberId: number;
  principal: number;
  interestRate: number;
  termMonths: number;
  notes?: string | null;
}

export interface Installment {
  id: number;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: InstallmentStatus;
  paidAt: string | null;
}

export interface LoanDetail {
  loan: Loan;
  installments: Installment[];
}

export interface ShuMember {
  memberId: number;
  memberNumber: string;
  fullName: string;
  totalSavings: number;
  share: number;
}

export interface ShuReport {
  year: number;
  pool: number;
  totalSavings: number;
  memberCount: number;
  members: ShuMember[];
}

export interface ApiErrorBody {
  code: string;
  message: string;
  traceId?: string;
  timestamp?: string;
  fieldErrors?: Record<string, string>;
}
