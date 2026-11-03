import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Api, errorMessage } from '../core/api';
import { AuthService } from '../core/auth.service';
import { Loan, Member } from '../core/models';
import { badgeClass, nullIfBlank, statusLabel } from '../core/ui';
import { ModalService } from '../ui/modal';
import { SelectComponent, SelectOption } from '../ui/select';

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'Semua status' },
  { value: 'APPLIED', label: 'Menunggu persetujuan' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'DISBURSED', label: 'Berjalan' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'REJECTED', label: 'Ditolak' },
];

@Component({
  selector: 'app-loans',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe, DecimalPipe, SelectComponent],
  template: `
    <div class="page-header">
      <div>
        <h1>Pinjaman</h1>
        <p>Pengajuan, persetujuan, pencairan, dan angsuran.</p>
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

    @if (showForm()) {
      <div class="card" style="margin-bottom: 24px">
        <div class="card-head"><h2>Pengajuan pinjaman baru</h2></div>
        <form class="card-body" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="form-grid">
            <div class="field span-2">
              <label for="l-member">Anggota <span class="req">*</span></label>
              <app-select
                id="l-member"
                formControlName="memberId"
                [options]="memberOptions()"
                placeholder="Pilih anggota…"
                [invalid]="invalid(form.controls.memberId)"
              />
              @if (invalid(form.controls.memberId)) {
                <p class="error-text">Pilih anggota terlebih dahulu.</p>
              }
            </div>
            <div class="field">
              <label for="l-principal">Pokok pinjaman (Rp) <span class="req">*</span></label>
              <input
                id="l-principal"
                type="number"
                step="0.01"
                min="0.01"
                formControlName="principal"
                [attr.aria-invalid]="invalid(form.controls.principal)"
              />
              @if (invalid(form.controls.principal)) {
                <p class="error-text">Pokok minimal Rp 0,01.</p>
              }
            </div>
            <div class="field">
              <label for="l-rate">Bunga (% per tahun) <span class="req">*</span></label>
              <input
                id="l-rate"
                type="number"
                step="0.01"
                min="0"
                formControlName="interestRate"
                [attr.aria-invalid]="invalid(form.controls.interestRate)"
              />
              <p class="hint">Bunga flat: pokok × bunga × tenor/12.</p>
            </div>
            <div class="field">
              <label for="l-term">Tenor (bulan) <span class="req">*</span></label>
              <input
                id="l-term"
                type="number"
                step="1"
                min="1"
                formControlName="termMonths"
                [attr.aria-invalid]="invalid(form.controls.termMonths)"
              />
            </div>
            <div class="field">
              <label for="l-notes">Catatan</label>
              <input id="l-notes" formControlName="notes" placeholder="Opsional" />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" type="button" (click)="toggleForm()">Batal</button>
            <button class="btn btn-primary" type="submit" [disabled]="saving()">
              @if (saving()) {
                <span class="spinner spinner-light" aria-hidden="true"></span> Menyimpan…
              } @else {
                Ajukan
              }
            </button>
          </div>
        </form>
      </div>
    }

    <div class="card">
      <div class="card-head">
        <h2>Daftar pinjaman</h2>
        <div class="toolbar">
          <app-select [formControl]="statusFilter" [options]="statusOptions" ariaLabel="Filter status" />
        </div>
      </div>
      <div class="table-wrap">
        @if (loading()) {
          <div class="loading" aria-busy="true"><span class="spinner" aria-hidden="true"></span> Memuat…</div>
        } @else if (filtered().length === 0) {
          <div class="empty">Tidak ada pinjaman dengan status ini.</div>
        } @else {
          <table class="data">
            <thead>
              <tr>
                <th>ID</th>
                <th>Anggota</th>
                <th class="num">Pokok</th>
                <th class="num">Bunga/thn</th>
                <th class="num">Tenor</th>
                <th class="num">Angsuran/bulan</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (loan of filtered(); track loan.id) {
                <tr>
                  <td>#{{ loan.id }}</td>
                  <td class="nowrap">{{ loan.memberNumber }}</td>
                  <td class="num">{{ loan.principal | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                  <td class="num">{{ loan.interestRate | number: '1.0-2' }}%</td>
                  <td class="num">{{ loan.termMonths }} bln</td>
                  <td class="num">{{ loan.monthlyInstallment | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                  <td><span [class]="badgeClass(loan.status)">{{ statusLabel(loan.status) }}</span></td>
                  <td>
                    <div class="table-actions">
                      <a class="btn btn-ghost btn-sm" [routerLink]="['/loans', loan.id]">Detail</a>
                      @if (isAdmin() && loan.status === 'APPLIED') {
                        <button
                          class="btn btn-sm btn-primary"
                          type="button"
                          [disabled]="actionId() === loan.id"
                          (click)="approve(loan)"
                        >
                          Setujui
                        </button>
                        <button
                          class="btn btn-sm btn-danger"
                          type="button"
                          [disabled]="actionId() === loan.id"
                          (click)="reject(loan)"
                        >
                          Tolak
                        </button>
                      }
                      @if (isStaff() && loan.status === 'APPROVED') {
                        <button
                          class="btn btn-sm btn-accent"
                          type="button"
                          [disabled]="actionId() === loan.id"
                          (click)="disburse(loan)"
                        >
                          Cairkan
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
})
export class LoansPage {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly modal = inject(ModalService);

  readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');
  readonly isStaff = computed(() => this.auth.role() === 'ADMIN' || this.auth.role() === 'TELLER');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly loans = signal<Loan[]>([]);
  readonly members = signal<Member[]>([]);
  readonly showForm = signal(false);
  readonly saving = signal(false);
  readonly actionId = signal<number | null>(null);

  readonly statusFilter = new FormControl<string>('ALL', { nonNullable: true });
  private readonly status = toSignal(this.statusFilter.valueChanges, { initialValue: 'ALL' });

  readonly memberOptions = computed<SelectOption[]>(() =>
    this.members().map((member) => ({
      value: member.id,
      label: `${member.memberNumber} — ${member.fullName}`,
    })),
  );

  readonly filtered = computed(() => {
    const filter = this.status();
    return filter === 'ALL' ? this.loans() : this.loans().filter((loan) => loan.status === filter);
  });

  readonly form = this.fb.nonNullable.group({
    memberId: [0, [Validators.required, Validators.min(1)]],
    principal: [5_000_000, [Validators.required, Validators.min(0.01)]],
    interestRate: [12, [Validators.required, Validators.min(0)]],
    termMonths: [12, [Validators.required, Validators.min(1)]],
    notes: [''],
  });

  protected readonly invalid = (control: AbstractControl): boolean =>
    control.invalid && control.touched;
  protected readonly badgeClass = badgeClass;
  protected readonly statusLabel = statusLabel;
  protected readonly statusOptions = STATUS_OPTIONS;

  constructor() {
    this.load();
    const memberId = Number(inject(ActivatedRoute).snapshot.queryParamMap.get('memberId'));
    if (memberId) {
      this.form.controls.memberId.setValue(memberId);
    }
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({ loans: this.api.loans.list(), members: this.api.members.list() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ loans, members }) => {
          this.loans.set(loans);
          this.members.set(members);
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
        memberId: v.memberId,
        principal: v.principal,
        interestRate: v.interestRate,
        termMonths: v.termMonths,
        notes: nullIfBlank(v.notes),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (loan) => {
          this.notice.set(`Pengajuan #${loan.id} tercatat (${statusLabel(loan.status)}).`);
          this.form.reset();
          this.showForm.set(false);
          this.load();
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }

  async approve(loan: Loan): Promise<void> {
    const ok = await this.modal.confirm({
      title: 'Setujui pinjaman',
      message: `Setujui pinjaman #${loan.id} untuk ${loan.memberNumber}?`,
      confirmLabel: 'Setujui',
    });
    if (!ok) {
      return;
    }
    this.actionId.set(loan.id);
    this.error.set(null);
    this.notice.set(null);
    this.api.loans
      .approve(loan.id)
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: () => {
          this.notice.set(`Pinjaman #${loan.id} disetujui.`);
          this.load();
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }

  async reject(loan: Loan): Promise<void> {
    const ok = await this.modal.confirm({
      title: 'Tolak pinjaman',
      message: `Tolak pinjaman #${loan.id} untuk ${loan.memberNumber}?`,
      confirmLabel: 'Tolak',
      danger: true,
    });
    if (!ok) {
      return;
    }
    this.actionId.set(loan.id);
    this.error.set(null);
    this.notice.set(null);
    this.api.loans
      .reject(loan.id)
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: () => {
          this.notice.set(`Pinjaman #${loan.id} ditolak.`);
          this.load();
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }

  async disburse(loan: Loan): Promise<void> {
    const ok = await this.modal.confirm({
      title: 'Cairkan pinjaman',
      message: `Cairkan pinjaman #${loan.id} sebesar ${loan.principal}?`,
      confirmLabel: 'Cairkan',
    });
    if (!ok) {
      return;
    }
    this.actionId.set(loan.id);
    this.error.set(null);
    this.notice.set(null);
    this.api.loans
      .disburse(loan.id)
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: () => {
          this.notice.set(`Pinjaman #${loan.id} dicairkan dan jadwal angsuran dibuat.`);
          this.load();
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }
}
