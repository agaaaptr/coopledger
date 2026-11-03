import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Api, errorMessage } from '../core/api';
import {
  LedgerTransaction,
  Loan,
  LoanDetail,
  Member,
  SavingsSummary,
  SavingsType,
} from '../core/models';
import { badgeClass, nullIfBlank, savingsLabels, savingsOrder, statusLabel, transactionLabels } from '../core/ui';

@Component({
  selector: 'app-me',
  imports: [ReactiveFormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Ruang anggota</h1>
        <p>Halo, {{ member()?.fullName ?? '…' }} — {{ member()?.memberNumber }}.</p>
      </div>
      <button class="btn btn-primary" type="button" (click)="toggleForm()">
        {{ showForm() ? 'Tutup form' : 'Ajukan pinjaman' }}
      </button>
    </div>

    @if (notice()) {
      <div class="alert alert-success" role="status" style="margin-bottom: 16px">{{ notice() }}</div>
    }
    @if (error()) {
      <div class="alert alert-error" role="alert" style="margin-bottom: 16px">
        <span>{{ error() }}</span>
        <button class="btn btn-ghost btn-sm" type="button" (click)="load()">Coba lagi</button>
      </div>
    }

    @if (loading()) {
      <div class="loading" aria-busy="true"><span class="spinner" aria-hidden="true"></span> Memuat…</div>
    } @else {
      <div class="stack">
        @if (showForm()) {
          <div class="card">
            <div class="card-head"><h2>Pengajuan pinjaman</h2></div>
            <form class="card-body" [formGroup]="form" (ngSubmit)="submit()" novalidate>
              <div class="form-grid">
                <div class="field">
                  <label for="me-principal">Pokok pinjaman (Rp) <span class="req">*</span></label>
                  <input id="me-principal" type="number" step="0.01" min="0.01" formControlName="principal" />
                </div>
                <div class="field">
                  <label for="me-rate">Bunga (% per tahun) <span class="req">*</span></label>
                  <input id="me-rate" type="number" step="0.01" min="0" formControlName="interestRate" />
                </div>
                <div class="field">
                  <label for="me-term">Tenor (bulan) <span class="req">*</span></label>
                  <input id="me-term" type="number" step="1" min="1" formControlName="termMonths" />
                </div>
                <div class="field">
                  <label for="me-notes">Catatan</label>
                  <input id="me-notes" formControlName="notes" placeholder="Opsional" />
                </div>
              </div>
              <div class="form-actions">
                <button class="btn btn-ghost" type="button" (click)="toggleForm()">Batal</button>
                <button class="btn btn-primary" type="submit" [disabled]="saving()">
                  @if (saving()) {
                    <span class="spinner spinner-light" aria-hidden="true"></span> Mengajukan…
                  } @else {
                    Ajukan
                  }
                </button>
              </div>
            </form>
          </div>
        }

        <div class="grid grid-2">
          <div class="card">
            <div class="card-head"><h2>Profil</h2></div>
            <div class="card-body">
              <dl class="detail-grid">
                <div>
                  <dt>Nama</dt>
                  <dd>{{ member()?.fullName }}</dd>
                </div>
                <div>
                  <dt>Telepon</dt>
                  <dd>{{ member()?.phone ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{{ member()?.email ?? '—' }}</dd>
                </div>
              </dl>
            </div>
          </div>

          @if (savings(); as s) {
            <div class="card">
              <div class="card-head">
                <h2>Simpanan saya</h2>
                <span class="badge badge-muted">Total {{ s.total | currency: 'IDR' : 'symbol' : '1.0-0' }}</span>
              </div>
              <div class="card-body">
                <div class="grid grid-3">
                  @for (type of savingsOrder; track type) {
                    <div class="card">
                      <div class="card-body">
                        <div class="stat-label">{{ savingsLabels[type] }}</div>
                        <div class="stat-value" style="font-size: 20px">
                          {{ balanceOf(s, type) | currency: 'IDR' : 'symbol' : '1.0-0' }}
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <div class="card">
          <div class="card-head">
            <h2>Pinjaman saya</h2>
            <p class="muted small">Setoran dan angsuran dicatat oleh teller.</p>
          </div>
          <div class="table-wrap">
            @if (loans().length === 0) {
              <div class="empty">Belum ada pinjaman.</div>
            } @else {
              <table class="data">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th class="num">Pokok</th>
                    <th class="num">Angsuran/bulan</th>
                    <th class="num">Tenor</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (loan of loans(); track loan.id) {
                    <tr>
                      <td>#{{ loan.id }}</td>
                      <td class="num">{{ loan.principal | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                      <td class="num">{{ loan.monthlyInstallment | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                      <td class="num">{{ loan.termMonths }} bln</td>
                      <td><span [class]="badgeClass(loan.status)">{{ statusLabel(loan.status) }}</span></td>
                      <td>
                        <button class="btn btn-ghost btn-sm" type="button" (click)="toggleDetail(loan.id)">
                          {{ isExpanded(loan.id) ? 'Tutup' : 'Rincian' }}
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        </div>

        @if (expanded(); as d) {
          <div class="card">
            <div class="card-head">
              <h2>Rincian pinjaman #{{ d.loan.id }}</h2>
              <span [class]="badgeClass(d.loan.status)">{{ statusLabel(d.loan.status) }}</span>
            </div>
            <div class="table-wrap">
              @if (d.installments.length === 0) {
                <div class="empty">Jadwal angsuran dibuat setelah pinjaman dicairkan.</div>
              } @else {
                <table class="data">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Jatuh tempo</th>
                      <th class="num">Jumlah</th>
                      <th class="num">Dibayar</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (installment of d.installments; track installment.installmentNumber) {
                      <tr>
                        <td>{{ installment.installmentNumber }}</td>
                        <td class="nowrap">{{ installment.dueDate | date: 'dd MMM yyyy' }}</td>
                        <td class="num">{{ installment.amount | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                        <td class="num">{{ installment.paidAmount | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                        <td>
                          <span [class]="badgeClass(installment.status)">{{ statusLabel(installment.status) }}</span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          </div>
        }

        <div class="card">
          <div class="card-head"><h2>Riwayat transaksi</h2></div>
          <div class="table-wrap">
            @if (transactions().length === 0) {
              <div class="empty">Belum ada transaksi.</div>
            } @else {
              <table class="data">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Jenis</th>
                    <th>Simpanan</th>
                    <th class="num">Nominal</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  @for (tx of transactions(); track tx.id) {
                    <tr>
                      <td class="nowrap">{{ tx.createdAt | date: 'dd MMM yyyy, HH:mm' }}</td>
                      <td>{{ transactionLabels[tx.type] }}</td>
                      <td>{{ tx.savingsType ? savingsLabels[tx.savingsType] : '—' }}</td>
                      <td class="num">{{ tx.amount | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                      <td class="muted small">{{ tx.note ?? '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class MePage {
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder);

  readonly member = signal<Member | null>(null);
  readonly savings = signal<SavingsSummary | null>(null);
  readonly transactions = signal<LedgerTransaction[]>([]);
  readonly loans = signal<Loan[]>([]);
  readonly expanded = signal<LoanDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly saving = signal(false);
  readonly showForm = signal(false);

  readonly form = this.fb.nonNullable.group({
    principal: [5_000_000, [Validators.required, Validators.min(0.01)]],
    interestRate: [12, [Validators.required, Validators.min(0)]],
    termMonths: [12, [Validators.required, Validators.min(1)]],
    notes: [''],
  });

  protected readonly savingsLabels = savingsLabels;
  protected readonly savingsOrder = savingsOrder;
  protected readonly transactionLabels = transactionLabels;
  protected readonly badgeClass = badgeClass;
  protected readonly statusLabel = statusLabel;

  constructor() {
    this.load();
  }

  protected balanceOf(summary: SavingsSummary, type: SavingsType): number {
    return summary.accounts.find((account) => account.type === type)?.balance ?? 0;
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      member: this.api.me.member(),
      savings: this.api.me.savings(),
      transactions: this.api.me.transactions(),
      loans: this.api.me.loans(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ member, savings, transactions, loans }) => {
          this.member.set(member);
          this.savings.set(savings);
          this.transactions.set(transactions);
          this.loans.set(loans);
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }

  toggleForm(): void {
    this.showForm.update((v) => !v);
    this.notice.set(null);
  }

  submit(): void {
    if (this.saving()) {
      return;
    }
    const memberId = this.member()?.id;
    if (!memberId) {
      this.error.set('Data anggota belum termuat.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api.loans
      .apply({
        memberId,
        principal: v.principal,
        interestRate: v.interestRate,
        termMonths: v.termMonths,
        notes: nullIfBlank(v.notes),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (loan) => {
          this.notice.set(`Pengajuan #${loan.id} tercatat. Menunggu persetujuan pengurus.`);
          this.form.reset();
          this.showForm.set(false);
          this.load();
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }

  protected isExpanded(id: number): boolean {
    return (this.expanded()?.loan.id ?? 0) === id;
  }

  toggleDetail(id: number): void {
    if (this.expanded()?.loan.id === id) {
      this.expanded.set(null);
      return;
    }
    this.api.me.loan(id).subscribe({
      next: (detail) => this.expanded.set(detail),
      error: (err: unknown) => this.error.set(errorMessage(err)),
    });
  }
}
