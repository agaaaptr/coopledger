import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Api, errorMessage } from '../core/api';
import {
  LedgerTransaction,
  Loan,
  Member,
  SavingsSummary,
  SavingsType,
} from '../core/models';
import { badgeClass, nullIfBlank, savingsLabels, savingsOrder, statusLabel, transactionLabels } from '../core/ui';
import { SelectComponent, SelectOption } from '../ui/select';

@Component({
  selector: 'app-member-detail',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe, DecimalPipe, SelectComponent],
  template: `
    <div class="page-header">
      <div>
        <a class="btn-link" routerLink="/members">← Kembali ke daftar</a>
        <h1 style="margin-top: 6px">{{ member()?.fullName ?? '…' }}</h1>
        <p>{{ member()?.memberNumber }} · status {{ member()?.status }}</p>
      </div>
      <a class="btn btn-primary" [routerLink]="['/loans']" [queryParams]="{ memberId: member()?.id }">
        Ajukan pinjaman
      </a>
    </div>

    @if (notice()) {
      <div class="alert alert-success" role="status" style="margin-bottom: 16px">{{ notice() }}</div>
    }
    @if (error()) {
      <div class="alert alert-error" role="alert" style="margin-bottom: 16px">
        <span>{{ error() }}</span>
        <button class="btn btn-ghost btn-sm" type="button" (click)="reload()">Coba lagi</button>
      </div>
    }

    @if (loading()) {
      <div class="loading" aria-busy="true"><span class="spinner" aria-hidden="true"></span> Memuat…</div>
    } @else if (member()) {
      <div class="stack">
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
                  <dt>NIK</dt>
                  <dd>{{ member()?.nik ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Telepon</dt>
                  <dd>{{ member()?.phone ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{{ member()?.email ?? '—' }}</dd>
                </div>
                <div>
                  <dt>Bergabung</dt>
                  <dd>{{ member()?.joinDate | date: 'dd MMM yyyy' }}</dd>
                </div>
                <div>
                  <dt>Alamat</dt>
                  <dd>{{ member()?.address ?? '—' }}</dd>
                </div>
              </dl>
            </div>
          </div>

          @if (savings(); as s) {
            <div class="card">
              <div class="card-head">
                <h2>Simpanan</h2>
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
          <div class="card-head"><h2>Catat setoran</h2></div>
          <form class="card-body" [formGroup]="depositForm" (ngSubmit)="deposit()" novalidate>
            <div class="form-grid">
              <div class="field">
                <label for="dep-type">Jenis simpanan</label>
                <app-select id="dep-type" formControlName="type" [options]="savingsTypeOptions" />
              </div>
              <div class="field">
                <label for="dep-amount">Nominal <span class="req">*</span></label>
                <input
                  id="dep-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  formControlName="amount"
                  [attr.aria-invalid]="invalid(depositForm.controls.amount)"
                />
                @if (invalid(depositForm.controls.amount)) {
                  <p class="error-text">Nominal minimal Rp 0,01.</p>
                }
              </div>
              <div class="field span-2">
                <label for="dep-note">Keterangan</label>
                <input id="dep-note" formControlName="note" placeholder="Opsional" />
              </div>
            </div>
            <div class="form-actions">
              <button class="btn btn-primary" type="submit" [disabled]="depositing()">
                @if (depositing()) {
                  <span class="spinner spinner-light" aria-hidden="true"></span> Menyimpan…
                } @else {
                  Simpan setoran
                }
              </button>
            </div>
          </form>
        </div>

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

        <div class="card">
          <div class="card-head"><h2>Pinjaman anggota</h2></div>
          <div class="table-wrap">
            @if (loans().length === 0) {
              <div class="empty">Belum ada pinjaman.</div>
            } @else {
              <table class="data">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th class="num">Pokok</th>
                    <th class="num">Bunga/tahun</th>
                    <th class="num">Tenor</th>
                    <th class="num">Angsuran/bulan</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (loan of loans(); track loan.id) {
                    <tr>
                      <td>#{{ loan.id }}</td>
                      <td class="num">{{ loan.principal | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                      <td class="num">{{ loan.interestRate | number: '1.0-2' }}%</td>
                      <td class="num">{{ loan.termMonths }} bln</td>
                      <td class="num">{{ loan.monthlyInstallment | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                      <td><span [class]="badgeClass(loan.status)">{{ statusLabel(loan.status) }}</span></td>
                      <td><a class="btn btn-ghost btn-sm" [routerLink]="['/loans', loan.id]">Detail</a></td>
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
export class MemberDetailPage {
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder);
  private readonly memberId = signal(0);

  readonly member = signal<Member | null>(null);
  readonly savings = signal<SavingsSummary | null>(null);
  readonly transactions = signal<LedgerTransaction[]>([]);
  readonly loans = signal<Loan[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly depositing = signal(false);

  readonly depositForm = this.fb.nonNullable.group({
    type: ['POKOK' as SavingsType, Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    note: [''],
  });

  protected readonly invalid = (control: AbstractControl): boolean =>
    control.invalid && control.touched;
  protected readonly savingsLabels = savingsLabels;
  protected readonly savingsOrder = savingsOrder;
  protected readonly transactionLabels = transactionLabels;
  protected readonly badgeClass = badgeClass;
  protected readonly statusLabel = statusLabel;
  protected readonly savingsTypeOptions: SelectOption[] = savingsOrder.map((type) => ({
    value: type,
    label: savingsLabels[type],
  }));

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(
        map((params) => Number(params.get('id'))),
        takeUntilDestroyed(),
      )
      .subscribe((id) => {
        this.memberId.set(id);
        this.reload();
      });
  }

  protected balanceOf(summary: SavingsSummary, type: SavingsType): number {
    return summary.accounts.find((account) => account.type === type)?.balance ?? 0;
  }

  reload(): void {
    const id = this.memberId();
    if (!id) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      member: this.api.members.get(id),
      savings: this.api.savings.summary(id),
      transactions: this.api.savings.transactions(id),
      loans: this.api.loans.list(id),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.member.set(result.member);
          this.savings.set(result.savings);
          this.transactions.set(result.transactions);
          this.loans.set(result.loans);
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }

  deposit(): void {
    if (this.depositing()) {
      return;
    }
    if (this.depositForm.invalid) {
      this.depositForm.markAllAsTouched();
      return;
    }
    const id = this.memberId();
    const { type, amount, note } = this.depositForm.getRawValue();
    this.depositing.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api.savings
      .deposit(id, { type, amount, note: nullIfBlank(note) })
      .pipe(finalize(() => this.depositing.set(false)))
      .subscribe({
        next: (summary) => {
          this.savings.set(summary);
          this.notice.set('Setoran berhasil dicatat.');
          this.depositForm.patchValue({ amount: 0, note: '' });
          this.api.savings.transactions(id).subscribe((transactions) => this.transactions.set(transactions));
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }
}
