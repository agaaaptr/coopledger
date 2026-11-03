import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Api, errorMessage } from '../core/api';
import { AuthService } from '../core/auth.service';
import { Loan, Member } from '../core/models';
import { badgeClass, statusLabel } from '../core/ui';

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p>Ringkasan operasional koperasi.</p>
      </div>
      <div class="toolbar">
        <a class="btn btn-ghost" routerLink="/members">Data anggota</a>
        <a class="btn btn-primary" routerLink="/loans">Kelola pinjaman</a>
      </div>
    </div>

    @if (error()) {
      <div class="alert alert-error" role="alert">
        <span>{{ error() }}</span>
        <button class="btn btn-ghost btn-sm" type="button" (click)="load()">Coba lagi</button>
      </div>
    }

    @if (loading()) {
      <div class="loading" aria-busy="true"><span class="spinner" aria-hidden="true"></span> Memuat data…</div>
    } @else {
      <div class="stack">
        <div class="grid grid-4">
          <div class="card card-body">
            <div class="stat-label">Anggota</div>
            <div class="stat-value">{{ totalMembers() }}</div>
            <div class="stat-hint">Terdaftar di koperasi</div>
          </div>
          <div class="card card-body stat-accent">
            <div class="stat-label">Menunggu persetujuan</div>
            <div class="stat-value">{{ pending() }}</div>
            <div class="stat-hint">Pengajuan pinjaman baru</div>
          </div>
          <div class="card card-body">
            <div class="stat-label">Pinjaman berjalan</div>
            <div class="stat-value">{{ active() }}</div>
            <div class="stat-hint">Sudah dicairkan</div>
          </div>
          <div class="card card-body">
            <div class="stat-label">Pinjaman selesai</div>
            <div class="stat-value">{{ completed() }}</div>
            <div class="stat-hint">Seluruh angsuran lunas</div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <h2>Pinjaman terbaru</h2>
            <a class="btn btn-ghost btn-sm" routerLink="/loans">Lihat semua</a>
          </div>
          <div class="table-wrap">
            @if (recent().length === 0) {
              <div class="empty">Belum ada pinjaman yang diajukan.</div>
            } @else {
              <table class="data">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Anggota</th>
                    <th class="num">Pokok</th>
                    <th class="num">Angsuran/bulan</th>
                    <th>Status</th>
                    <th>Diajukan</th>
                  </tr>
                </thead>
                <tbody>
                  @for (loan of recent(); track loan.id) {
                    <tr>
                      <td><a [routerLink]="['/loans', loan.id]">#{{ loan.id }}</a></td>
                      <td>{{ loan.memberNumber }}</td>
                      <td class="num">{{ loan.principal | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                      <td class="num">{{ loan.monthlyInstallment | currency: 'IDR' : 'symbol' : '1.0-0' }}</td>
                      <td><span [class]="badgeClass(loan.status)">{{ statusLabel(loan.status) }}</span></td>
                      <td class="nowrap">{{ loan.appliedAt | date: 'dd MMM yyyy' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        </div>

        <div class="grid grid-3">
          <a class="card card-body" routerLink="/members" style="text-decoration: none; color: inherit">
            <div class="stat-label">Anggota</div>
            <p class="muted small" style="margin-top: 6px">
              Daftar anggota, profil, simpanan, dan riwayat transaksi.
            </p>
          </a>
          <a class="card card-body" routerLink="/loans" style="text-decoration: none; color: inherit">
            <div class="stat-label">Pinjaman</div>
            <p class="muted small" style="margin-top: 6px">
              Ajukan, setujui, cairkan, dan catat pembayaran angsuran.
            </p>
          </a>
          @if (isAdmin()) {
            <a class="card card-body" routerLink="/reports" style="text-decoration: none; color: inherit">
              <div class="stat-label">Laporan SHU</div>
              <p class="muted small" style="margin-top: 6px">
                Hitung pembagian sisa hasil usaha proporsional simpanan.
              </p>
            </a>
          }
        </div>
      </div>
    }
  `,
})
export class DashboardPage {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);

  readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly members = signal<Member[]>([]);
  readonly loans = signal<Loan[]>([]);

  readonly totalMembers = computed(() => this.members().length);
  readonly pending = computed(() => this.loans().filter((l) => l.status === 'APPLIED').length);
  readonly active = computed(() => this.loans().filter((l) => l.status === 'DISBURSED').length);
  readonly completed = computed(() => this.loans().filter((l) => l.status === 'COMPLETED').length);
  readonly recent = computed(() =>
    [...this.loans()].sort((a, b) => b.id - a.id).slice(0, 6),
  );

  protected readonly badgeClass = badgeClass;
  protected readonly statusLabel = statusLabel;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({ members: this.api.members.list(), loans: this.api.loans.list() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ members, loans }) => {
          this.members.set(members);
          this.loans.set(loans);
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }
}
