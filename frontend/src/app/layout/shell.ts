import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { roleLabel } from '../core/ui';
import { ModalComponent } from '../ui/modal';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ModalComponent],
  template: `
    <div class="app">
      <aside class="sidebar">
        <a class="brand" routerLink="/">
          <span class="brand-mark" aria-hidden="true">CL</span>
          <span class="brand-text">
            <strong>CoopLedger</strong>
            <small>Koperasi simpan pinjam</small>
          </span>
        </a>

        <nav class="nav" aria-label="Navigasi utama">
          @if (isStaff()) {
            <a routerLink="/dashboard" routerLinkActive="active" ariaCurrentWhenActive="page">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              Dashboard
            </a>
            <a routerLink="/members" routerLinkActive="active" ariaCurrentWhenActive="page">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Anggota
            </a>
            <a routerLink="/loans" routerLinkActive="active" ariaCurrentWhenActive="page">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
              Pinjaman
            </a>
          }
          @if (isAdmin()) {
            <a routerLink="/reports" routerLinkActive="active" ariaCurrentWhenActive="page">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 3v18h18" />
                <path d="M18 17V9" />
                <path d="M13 17V5" />
                <path d="M8 17v-3" />
              </svg>
              Laporan SHU
            </a>
          }
          @if (isMember()) {
            <a routerLink="/me" routerLinkActive="active" ariaCurrentWhenActive="page">
              <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Ruang anggota
            </a>
          }
        </nav>

        <div class="sidebar-foot">
          @if (user(); as u) {
            <div class="user-chip">
              <strong>{{ u.fullName }}</strong>
              <span>{{ roleName() }} · {{ u.username }}</span>
            </div>
          }
          <button class="btn btn-ghost btn-sm" type="button" (click)="logout()">Keluar</button>
        </div>
      </aside>

      <main class="main">
        <router-outlet />
      </main>

      <app-modal />
    </div>
  `,
})
export class Shell {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');
  readonly isStaff = computed(() => this.auth.role() === 'ADMIN' || this.auth.role() === 'TELLER');
  readonly isMember = computed(() => this.auth.role() === 'MEMBER');
  readonly roleName = computed(() => roleLabel(this.auth.role()));

  logout(): void {
    this.auth.logout();
  }
}
