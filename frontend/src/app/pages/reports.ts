import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Api, errorMessage } from '../core/api';
import { Member, SavingsSummary, SavingsType, ShuReport } from '../core/models';
import { savingsLabels, savingsOrder } from '../core/ui';

interface SavingsRow {
  member: Member;
  summary: SavingsSummary;
}

@Component({
  selector: 'app-reports',
  imports: [ReactiveFormsModule, CurrencyPipe],
  template: `
    <div class="page-header">
      <div>
        <h1>Laporan SHU</h1>
        <p>Pembagian sisa hasil usaha dan ringkasan simpanan.</p>
      </div>
    </div>

    @if (error()) {
      <div class="alert alert-error" role="alert" style="margin-bottom: 16px">
        <span>{{ error() }}</span>
        <button class="btn btn-ghost btn-sm" type="button" (click)="reload()">Coba lagi</button>
      </div>
    }

    <div class="stack">
      <div class="card">
        <div class="card-head"><h2>Hitung SHU</h2></div>
        <form class="card-body" [formGroup]="form" (ngSubmit)="run()" novalidate>
          <div class="form-grid">
            <div class="field">
              <label for="shu-year">Tahun buku</label>
              <input id="shu-year" type="number" step="1" min="2000" formControlName="year" />
            </div>
            <div class="field">
              <label for="shu-pool">Total SHU yang dibagikan (Rp)</label>
              <input id="shu-pool" type="number" step="0.01" min="0.01" formControlName="pool" />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit" [disabled]="running()">
              @if (running()) {
                <span class="spinner spinner-light" aria-hidden="true"></span> Menghitung…
              } @else {
                Hitung
              }
            </button>
          </div>
          <p class="hint" style="margin-top: 12px">
            SHU dibagi proporsional terhadap total simpanan setiap anggota aktif.
          </p>
        </form>
      </div>

      @if (report(); as report) {
        <div class="grid grid-3">
          <div class="card card-body">
            <div class="stat-label">Total simpanan</div>
            <div class="stat-value">{{ report.totalSavings | currency: 'IDR' : 'symbol' : '1.0-0' }}</div>
          </div>
          <div class="card card-body">
            <div class="stat-label">Anggota aktif</div>
            <div class="stat-value">{{ report.memberCount }}</div>
          </div>
          <div class="card card-body stat-accent">
            <div class="stat-label">Pool SHU</div>
            <div class="stat-value">{{ report.pool | currency: 'IDR' : 'symbol' : '1.0-0' }}</div>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>Pembagian SHU {{ report.year }}</h2></div>
          <div class="table-wrap">
            @if (report.members.length === 0) {
              <div class="empty">Tidak ada anggota aktif.</div>
            } @else {
              <table class="data">
                <thead>
                  <tr>
                    <th>Anggota</th>
                    <th>Nama</th>
                    <th class="num">Total simpanan</th>
                    <th class="num">Bagian SHU</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of report.members; track row.memberId) {
                    <tr>
                      <td class="nowrap">{{ row.memberNumber }}</td>
                      <td>{{ row.fullName }}</td>
                      <td class="num">{{ row.totalSavings | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                      <td class="num">{{ row.share | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        </div>
      }

      <div class="card">
        <div class="card-head"><h2>Ringkasan simpanan anggota</h2></div>
        <div class="table-wrap">
          @if (loading()) {
            <div class="loading" aria-busy="true"><span class="spinner" aria-hidden="true"></span> Memuat…</div>
          } @else if (savingsRows().length === 0) {
            <div class="empty">Belum ada anggota.</div>
          } @else {
            <table class="data">
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Nama</th>
                  <th class="num">Pokok</th>
                  <th class="num">Wajib</th>
                  <th class="num">Sukarela</th>
                  <th class="num">Total</th>
                </tr>
              </thead>
              <tbody>
                @for (row of savingsRows(); track row.member.id) {
                  <tr>
                    <td class="nowrap">{{ row.member.memberNumber }}</td>
                    <td>{{ row.member.fullName }}</td>
                    <td class="num">{{ balanceOf(row.summary, 'POKOK') | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                    <td class="num">{{ balanceOf(row.summary, 'WAJIB') | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                    <td class="num">{{ balanceOf(row.summary, 'SUKARELA') | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                    <td class="num">{{ row.summary.total | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      </div>
    </div>
  `,
})
export class ReportsPage {
  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    year: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
    pool: [10_000_000, [Validators.required, Validators.min(0.01)]],
  });

  readonly report = signal<ShuReport | null>(null);
  readonly savingsRows = signal<SavingsRow[]>([]);
  readonly loading = signal(true);
  readonly running = signal(false);
  readonly error = signal<string | null>(null);

  protected readonly savingsLabels = savingsLabels;
  protected readonly savingsOrder = savingsOrder;

  constructor() {
    this.loadOverview();
    this.run();
  }

  protected balanceOf(summary: SavingsSummary, type: SavingsType): number {
    return summary.accounts.find((account) => account.type === type)?.balance ?? 0;
  }

  reload(): void {
    this.loadOverview();
    this.run();
  }

  // ponytail: one savings call per member (N+1). Fine at MVP scale; add an aggregate endpoint if N grows.
  private loadOverview(): void {
    this.loading.set(true);
    this.api.members
      .list()
      .pipe(
        switchMap((members) =>
          members.length
            ? forkJoin(
                members.map((member) =>
                  this.api.savings
                    .summary(member.id)
                    .pipe(map((summary) => ({ member, summary }) as SavingsRow)),
                ),
              )
            : of([] as SavingsRow[]),
        ),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (rows) => this.savingsRows.set(rows),
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }

  run(): void {
    if (this.running() || this.form.invalid) {
      return;
    }
    this.running.set(true);
    this.error.set(null);
    const { year, pool } = this.form.getRawValue();
    this.api.reports
      .shu(year, pool)
      .pipe(finalize(() => this.running.set(false)))
      .subscribe({
        next: (report) => this.report.set(report),
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }
}
