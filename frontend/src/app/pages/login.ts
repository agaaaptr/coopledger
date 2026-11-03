import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { errorMessage } from '../core/api';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <div class="auth-wrap">
      <section class="auth-brand">
        <div>
          <div class="brand">
            <span class="brand-mark" aria-hidden="true">CL</span>
            <span class="brand-text">
              <strong>CoopLedger</strong>
              <small>Koperasi simpan pinjam</small>
            </span>
          </div>
          <h1>Setiap andil anggota, dalam satu ledger.</h1>
          <p>
            Kelola keanggotaan, simpanan pokok/wajib/sukarela, pinjaman beserta angsurannya, dan
            pembagian SHU dari satu tempat.
          </p>
        </div>
        <ul class="auth-points">
          <li>Simpanan dan transaksi tercatat per anggota</li>
          <li>Alur pinjaman: pengajuan, persetujuan, pencairan, angsuran</li>
          <li>Akses berbasis peran: pengurus, teller, anggota</li>
        </ul>
      </section>

      <section class="auth-panel">
        <form class="auth-card" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div>
            <h2>Masuk ke CoopLedger</h2>
            <p class="muted small">Gunakan akun koperasi Anda.</p>
          </div>

          @if (error()) {
            <div class="alert alert-error" role="alert">{{ error() }}</div>
          }

          <div class="field">
            <label for="username">Nama pengguna</label>
            <input
              id="username"
              formControlName="username"
              autocomplete="username"
              autofocus
              [attr.aria-invalid]="invalid(form.controls.username)"
              [attr.aria-describedby]="invalid(form.controls.username) ? 'username-error' : null"
            />
            @if (invalid(form.controls.username)) {
              <p class="error-text" id="username-error">Nama pengguna wajib diisi.</p>
            }
          </div>

          <div class="field">
            <label for="password">Kata sandi</label>
            <input
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
              [attr.aria-invalid]="invalid(form.controls.password)"
              [attr.aria-describedby]="invalid(form.controls.password) ? 'password-error' : null"
            />
            @if (invalid(form.controls.password)) {
              <p class="error-text" id="password-error">Kata sandi wajib diisi.</p>
            }
          </div>

          <button class="btn btn-primary" type="submit" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner spinner-light" aria-hidden="true"></span>
              Memproses…
            } @else {
              Masuk
            }
          </button>

          <div class="demo-creds">
            <p class="demo-title">Akun demo (klik untuk mengisi)</p>
            <div class="demo-list">
              @for (account of demoAccounts; track account.username) {
                <button
                  type="button"
                  class="demo-item"
                  (click)="fill(account.username, account.password)"
                >
                  <span><strong>{{ account.username }}</strong> / {{ account.password }}</span>
                  <span class="muted">{{ account.label }}</span>
                </button>
              }
            </div>
          </div>
        </form>
      </section>
    </div>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly demoAccounts = [
    { username: 'admin', password: 'admin123', label: 'Pengurus' },
    { username: 'teller', password: 'teller123', label: 'Teller' },
    { username: 'member', password: 'member123', label: 'Anggota' },
  ];

  invalid(control: { invalid: boolean; touched: boolean }): boolean {
    return control.invalid && control.touched;
  }

  fill(username: string, password: string): void {
    this.form.setValue({ username, password });
  }

  submit(): void {
    if (this.loading()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const { username, password } = this.form.getRawValue();

    this.auth.login(username, password).subscribe({
      next: () => void this.router.navigateByUrl(this.auth.home()),
      error: (err: unknown) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
