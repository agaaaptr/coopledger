import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Api, errorMessage } from '../core/api';
import { AuthService } from '../core/auth.service';
import { Installment, LoanDetail } from '../core/models';
import { badgeClass, statusLabel } from '../core/ui';
import { ModalService } from '../ui/modal';

@Component({
  selector: 'app-loan-detail',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe, DecimalPipe],
  template: `
    <div class="page-header">
      <div>
        <a class="btn-link" routerLink="/loans">← Kembali ke daftar</a>
        @if (detail(); as d) {
          <h1 style="margin-top: 6px">Pinjaman #{{ d.loan.id }}</h1>
          <p>{{ d.loan.memberNumber }} · {{ statusLabel(d.loan.status) }}</p>
        }
      </div>
      @if (detail()?.loan; as loan) {
        <div class="toolbar">
          @if (isAdmin() && loan.status === 'APPLIED') {
            <button class="btn btn-primary" type="button" [disabled]="working()" (click)="approve()">
              Setujui
            </button>
            <button class="btn btn-danger" type="button" [disabled]="working()" (click)="reject()">
              Tolak
            </button>
          }
          @if (isStaff() && loan.status === 'APPROVED') {
            <button class="btn btn-accent" type="button" [disabled]="working()" (click)="disburse()">
              Cairkan
            </button>
          }
        </div>
      }
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
    } @else if (detail(); as d) {
      <div class="stack">
        <div class="card">
          <div class="card-head">
            <h2>Rincian pinjaman</h2>
            <span [class]="badgeClass(d.loan.status)">{{ statusLabel(d.loan.status) }}</span>
          </div>
          <div class="card-body">
            <dl class="detail-grid">
              <div>
                <dt>Anggota</dt>
                <dd>{{ d.loan.memberNumber }}</dd>
              </div>
              <div>
                <dt>Pokok</dt>
                <dd>{{ d.loan.principal | currency: 'IDR' : 'symbol' : '1.0-0' }}</dd>
              </div>
              <div>
                <dt>Bunga</dt>
                <dd>{{ d.loan.interestRate | number: '1.0-2' }}% / tahun</dd>
              </div>
              <div>
                <dt>Tenor</dt>
                <dd>{{ d.loan.termMonths }} bulan</dd>
              </div>
              <div>
                <dt>Total bunga</dt>
                <dd>{{ d.loan.totalInterest | currency: 'IDR' : 'symbol' : '1.0-0' }}</dd>
              </div>
              <div>
                <dt>Total pengembalian</dt>
                <dd>{{ d.loan.totalRepayment | currency: 'IDR' : 'symbol' : '1.0-0' }}</dd>
              </div>
              <div>
                <dt>Angsuran/bulan</dt>
                <dd>{{ d.loan.monthlyInstallment | currency: 'IDR' : 'symbol' : '1.0-0' }}</dd>
              </div>
              <div>
                <dt>Diajukan</dt>
                <dd>{{ d.loan.appliedAt | date: 'dd MMM yyyy' }}</dd>
              </div>
              @if (d.loan.disbursedAt) {
                <div>
                  <dt>Dicairkan</dt>
                  <dd>{{ d.loan.disbursedAt | date: 'dd MMM yyyy' }}</dd>
                </div>
              }
              @if (d.loan.notes) {
                <div>
                  <dt>Catatan</dt>
                  <dd>{{ d.loan.notes }}</dd>
                </div>
              }
            </dl>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <h2>Jadwal angsuran</h2>
            <span class="muted small">
              Terbayar {{ totalPaid() | currency: 'IDR' : 'symbol' : '1.0-0' }} dari
              {{ totalScheduled() | currency: 'IDR' : 'symbol' : '1.0-0' }}
            </span>
          </div>
          <div class="table-wrap">
            @if (d.installments.length === 0) {
              <div class="empty">Jadwal angsuran dibuat saat pinjaman dicairkan.</div>
            } @else {
              <table class="data">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jatuh tempo</th>
                    <th class="num">Jumlah</th>
                    <th class="num">Dibayar</th>
                    <th>Status</th>
                    <th class="num">Aksi</th>
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
                      <td class="num">
                        @if (paying() === installment.installmentNumber) {
                          <form
                            class="table-actions"
                            style="justify-content: flex-end"
                            [formGroup]="payForm"
                            (ngSubmit)="pay(installment)"
                          >
                            <input
                              class="pay-input"
                              type="number"
                              step="0.01"
                              min="0.01"
                              formControlName="amount"
                              aria-label="Nominal pembayaran"
                            />
                            <button class="btn btn-sm btn-primary" type="submit" [disabled]="working()">
                              Simpan
                            </button>
                            <button class="btn btn-sm btn-ghost" type="button" (click)="cancelPay()">Batal</button>
                          </form>
                        } @else if (isStaff() && d.loan.status === 'DISBURSED' && installment.status === 'PENDING') {
                          <button class="btn btn-sm btn-ghost" type="button" (click)="startPay(installment)">
                            Bayar
                          </button>
                        } @else {
                          <span class="muted">—</span>
                        }
                      </td>
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
  styles: [
    `
      .pay-input {
        width: 150px;
        min-height: 32px;
        padding: 5px 9px;
        border: 1px solid #cbd5e1;
        border-radius: 7px;
        font-size: 13px;
      }
    `,
  ],
})
export class LoanDetailPage {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(ModalService);
  private readonly loanId = signal(0);

  readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');
  readonly isStaff = computed(() => this.auth.role() === 'ADMIN' || this.auth.role() === 'TELLER');

  readonly detail = signal<LoanDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly working = signal(false);
  readonly paying = signal<number | null>(null);

  readonly payForm = this.fb.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
  });

  readonly totalPaid = computed(() =>
    this.detail()?.installments.reduce((sum, i) => sum + i.paidAmount, 0) ?? 0,
  );
  readonly totalScheduled = computed(() =>
    this.detail()?.installments.reduce((sum, i) => sum + i.amount, 0) ?? 0,
  );

  protected readonly invalid = (control: AbstractControl): boolean =>
    control.invalid && control.touched;
  protected readonly badgeClass = badgeClass;
  protected readonly statusLabel = statusLabel;

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(
        map((params) => Number(params.get('id'))),
        takeUntilDestroyed(),
      )
      .subscribe((id) => {
        this.loanId.set(id);
        this.load();
      });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.loans
      .get(this.loanId())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => this.detail.set(detail),
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }

  startPay(installment: Installment): void {
    this.paying.set(installment.installmentNumber);
    this.payForm.setValue({ amount: installment.amount });
  }

  cancelPay(): void {
    this.paying.set(null);
  }

  pay(installment: Installment): void {
    if (this.working() || this.payForm.invalid) {
      this.payForm.markAllAsTouched();
      return;
    }
    this.working.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.api.loans
      .pay(this.loanId(), installment.installmentNumber, this.payForm.getRawValue().amount)
      .pipe(finalize(() => this.working.set(false)))
      .subscribe({
        next: (detail) => {
          this.detail.set(detail);
          this.paying.set(null);
          this.notice.set(`Angsuran #${installment.installmentNumber} tercatat lunas.`);
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }

  async approve(): Promise<void> {
    const detail = this.detail();
    if (!detail) {
      return;
    }
    const ok = await this.modal.confirm({
      title: 'Setujui pinjaman',
      message: `Setujui pinjaman #${detail.loan.id}?`,
      confirmLabel: 'Setujui',
    });
    if (!ok) {
      return;
    }
    this.working.set(true);
    this.error.set(null);
    this.api.loans
      .approve(detail.loan.id)
      .pipe(finalize(() => this.working.set(false)))
      .subscribe({
        next: () => {
          this.notice.set('Pinjaman disetujui.');
          this.load();
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }

  async reject(): Promise<void> {
    const detail = this.detail();
    if (!detail) {
      return;
    }
    const ok = await this.modal.confirm({
      title: 'Tolak pinjaman',
      message: `Tolak pinjaman #${detail.loan.id}?`,
      confirmLabel: 'Tolak',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.working.set(true);
    this.error.set(null);
    this.api.loans
      .reject(detail.loan.id)
      .pipe(finalize(() => this.working.set(false)))
      .subscribe({
        next: () => {
          this.notice.set('Pinjaman ditolak.');
          this.load();
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }

  async disburse(): Promise<void> {
    const detail = this.detail();
    if (!detail) {
      return;
    }
    const ok = await this.modal.confirm({
      title: 'Cairkan pinjaman',
      message: `Cairkan pinjaman #${detail.loan.id}?`,
      confirmLabel: 'Cairkan',
    });
    if (!ok) {
      return;
    }
    this.working.set(true);
    this.error.set(null);
    this.api.loans
      .disburse(detail.loan.id)
      .pipe(finalize(() => this.working.set(false)))
      .subscribe({
        next: (updated) => {
          this.detail.set(updated);
          this.notice.set('Pinjaman dicairkan dan jadwal angsuran dibuat.');
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }
}
