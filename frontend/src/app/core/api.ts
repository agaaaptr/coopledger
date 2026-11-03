import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ApiErrorBody,
  LedgerTransaction,
  Loan,
  LoanCreateRequest,
  LoanDetail,
  Member,
  MemberCreateRequest,
  SavingsDepositRequest,
  SavingsSummary,
  ShuReport,
} from './models';

/** Thin typed wrapper over the Spring Boot API. One client so every endpoint lives in one place. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  readonly members = {
    list: (): Observable<Member[]> => this.http.get<Member[]>('/api/members'),
    get: (id: number): Observable<Member> => this.http.get<Member>(`/api/members/${id}`),
    create: (body: MemberCreateRequest): Observable<Member> =>
      this.http.post<Member>('/api/members', body),
  };

  readonly savings = {
    summary: (memberId: number): Observable<SavingsSummary> =>
      this.http.get<SavingsSummary>(`/api/members/${memberId}/savings`),
    deposit: (memberId: number, body: SavingsDepositRequest): Observable<SavingsSummary> =>
      this.http.post<SavingsSummary>(`/api/members/${memberId}/savings/deposit`, body),
    transactions: (memberId: number): Observable<LedgerTransaction[]> =>
      this.http.get<LedgerTransaction[]>(`/api/members/${memberId}/transactions`),
  };

  readonly loans = {
    apply: (body: LoanCreateRequest): Observable<Loan> => this.http.post<Loan>('/api/loans', body),
    list: (memberId?: number): Observable<Loan[]> =>
      this.http.get<Loan[]>('/api/loans', { params: memberId ? { memberId } : {} }),
    get: (id: number): Observable<LoanDetail> => this.http.get<LoanDetail>(`/api/loans/${id}`),
    approve: (id: number): Observable<Loan> => this.http.post<Loan>(`/api/loans/${id}/approve`, null),
    reject: (id: number): Observable<Loan> => this.http.post<Loan>(`/api/loans/${id}/reject`, null),
    disburse: (id: number): Observable<LoanDetail> =>
      this.http.post<LoanDetail>(`/api/loans/${id}/disburse`, null),
    pay: (loanId: number, installmentNumber: number, amount: number): Observable<LoanDetail> =>
      this.http.post<LoanDetail>(`/api/loans/${loanId}/installments/${installmentNumber}/pay`, {
        amount,
      }),
  };

  readonly reports = {
    shu: (year: number, pool: number): Observable<ShuReport> =>
      this.http.get<ShuReport>('/api/reports/shu', { params: { year, pool } }),
  };

  readonly me = {
    member: (): Observable<Member> => this.http.get<Member>('/api/me/member'),
    savings: (): Observable<SavingsSummary> => this.http.get<SavingsSummary>('/api/me/savings'),
    transactions: (): Observable<LedgerTransaction[]> =>
      this.http.get<LedgerTransaction[]>('/api/me/transactions'),
    loans: (): Observable<Loan[]> => this.http.get<Loan[]>('/api/me/loans'),
    loan: (id: number): Observable<LoanDetail> => this.http.get<LoanDetail>(`/api/me/loans/${id}`),
  };
}

/** Extracts a human-readable message from the backend's ApiError envelope. */
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as Partial<ApiErrorBody> | string | null;
    if (body && typeof body === 'object' && typeof body.message === 'string') {
      return body.message;
    }
    if (body && typeof body === 'string' && body.trim() !== '') {
      return body;
    }
    if (error.status === 0) {
      return 'Tidak dapat terhubung ke server. Pastikan backend berjalan di port 8080.';
    }
    return `Permintaan gagal (HTTP ${error.status}).`;
  }
  return 'Terjadi kesalahan tak terduga.';
}
