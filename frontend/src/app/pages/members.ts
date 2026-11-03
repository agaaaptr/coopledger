import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { Api, errorMessage } from '../core/api';
import { AuthService } from '../core/auth.service';
import { Member } from '../core/models';
import { nullIfBlank, phoneCountries } from '../core/ui';
import { SelectComponent } from '../ui/select';

@Component({
  selector: 'app-members',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, SelectComponent],
  template: `
    <div class="page-header">
      <div>
        <h1>Anggota</h1>
        <p>Daftar anggota koperasi.</p>
      </div>
      @if (isAdmin()) {
        <button class="btn btn-primary" type="button" (click)="toggleForm()">
          {{ showForm() ? 'Tutup form' : 'Tambah anggota' }}
        </button>
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

    @if (showForm() && isAdmin()) {
      <div class="card" style="margin-bottom: 24px">
        <div class="card-head"><h2>Anggota baru</h2></div>
        <form class="card-body" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="form-grid">
            <div class="field">
              <label for="m-fullname">Nama lengkap <span class="req">*</span></label>
              <input
                id="m-fullname"
                formControlName="fullName"
                [attr.aria-invalid]="invalid(form.controls.fullName)"
              />
              @if (invalid(form.controls.fullName)) {
                <p class="error-text">Nama lengkap wajib diisi.</p>
              }
            </div>
            <div class="field">
              <label for="m-number">Nomor anggota</label>
              <input id="m-number" formControlName="memberNumber" />
              <p class="hint">Kosongkan untuk nomor otomatis (M-xxxx).</p>
            </div>
            <div class="field">
              <label for="m-nik">NIK</label>
              <input
                id="m-nik"
                formControlName="nik"
                inputmode="numeric"
                maxlength="16"
                placeholder="16 digit"
                [attr.aria-invalid]="invalid(form.controls.nik)"
              />
              @if (invalid(form.controls.nik)) {
                <p class="error-text">NIK harus 16 digit angka.</p>
              }
            </div>
            <div class="field span-2">
              <label for="m-phone">Nomor telepon</label>
              <div class="phone-group">
                <app-select
                  formControlName="phoneCountry"
                  [options]="phoneCountryOptions"
                  ariaLabel="Kode negara"
                />
                <input
                  id="m-phone"
                  formControlName="phoneNumber"
                  type="tel"
                  inputmode="numeric"
                  placeholder="81234567890"
                  [attr.aria-invalid]="invalid(form.controls.phoneNumber)"
                />
              </div>
              <p class="hint">Angka 0 di awal otomatis diganti kode negara.</p>
              @if (invalid(form.controls.phoneNumber)) {
                <p class="error-text">Nomor telepon hanya angka, 6–15 digit.</p>
              }
            </div>
            <div class="field">
              <label for="m-email">Email</label>
              <input id="m-email" type="email" formControlName="email" />
              @if (invalid(form.controls.email)) {
                <p class="error-text">Format email tidak valid.</p>
              }
            </div>
            <div class="field">
              <label for="m-username">Username login</label>
              <input id="m-username" formControlName="username" autocomplete="off" />
              <p class="hint">Opsional — 3–30 karakter (huruf, angka, titik, garis).</p>
              @if (invalid(form.controls.username)) {
                <p class="error-text">Username 3–30 karakter: huruf, angka, titik, garis.</p>
              }
            </div>
            <div class="field">
              <label for="m-password">Password login</label>
              <input id="m-password" type="password" formControlName="password" autocomplete="new-password" />
              <p class="hint">Wajib jika username diisi — minimal 6 karakter.</p>
              @if (invalid(form.controls.password)) {
                <p class="error-text">Password minimal 6 karakter, tanpa spasi.</p>
              }
            </div>
            <div class="field span-2">
              <label for="m-address">Alamat</label>
              <textarea id="m-address" formControlName="address"></textarea>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-ghost" type="button" (click)="toggleForm()">Batal</button>
            <button class="btn btn-primary" type="submit" [disabled]="saving()">
              @if (saving()) {
                <span class="spinner spinner-light" aria-hidden="true"></span> Menyimpan…
              } @else {
                Simpan anggota
              }
            </button>
          </div>
        </form>
      </div>
    }

    <div class="card">
      <div class="card-head">
        <h2>Daftar anggota</h2>
        <p>{{ members().length }} terdaftar</p>
      </div>
      <div class="table-wrap">
        @if (loading()) {
          <div class="loading" aria-busy="true"><span class="spinner" aria-hidden="true"></span> Memuat…</div>
        } @else if (members().length === 0) {
          <div class="empty">Belum ada anggota.</div>
        } @else {
          <table class="data">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Nama</th>
                <th>Telepon</th>
                <th>Bergabung</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (member of members(); track member.id) {
                <tr>
                  <td class="nowrap">{{ member.memberNumber }}</td>
                  <td>{{ member.fullName }}</td>
                  <td class="nowrap">{{ member.phone ?? '—' }}</td>
                  <td class="nowrap">{{ member.joinDate | date: 'dd MMM yyyy' }}</td>
                  <td><span class="badge badge-success">{{ member.status }}</span></td>
                  <td><a class="btn btn-ghost btn-sm" [routerLink]="['/members', member.id]">Detail</a></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
})
export class MembersPage {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly members = signal<Member[]>([]);
  readonly showForm = signal(false);
  readonly saving = signal(false);

  readonly phoneCountryOptions = phoneCountries.map((country) => ({
    value: country.dial,
    label: `${country.dial} · ${country.name}`,
  }));

  readonly form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    memberNumber: [''],
    nik: ['', Validators.pattern(/^([0-9]{16})?$/)],
    phoneCountry: ['+62'],
    phoneNumber: ['', Validators.pattern(/^([0-9]{6,15})?$/)],
    email: ['', Validators.email],
    address: [''],
    username: ['', Validators.pattern(/^([A-Za-z0-9._-]{3,30})?$/)],
    password: ['', Validators.pattern(/^(\S{6,64})?$/)],
  });

  protected readonly invalid = (control: AbstractControl): boolean =>
    control.invalid && control.touched;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.members
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (members) => this.members.set(members),
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
    const phoneDigits = v.phoneNumber.replace(/^0+/, '');
    const phone = phoneDigits ? `${v.phoneCountry}${phoneDigits}` : null;

    this.saving.set(true);
    this.api.members
      .create({
        fullName: v.fullName.trim(),
        memberNumber: nullIfBlank(v.memberNumber),
        nik: nullIfBlank(v.nik),
        phone,
        email: nullIfBlank(v.email),
        address: nullIfBlank(v.address),
        username: nullIfBlank(v.username),
        password: nullIfBlank(v.password),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (member) => {
          this.notice.set(`Anggota ${member.memberNumber} — ${member.fullName} berhasil ditambahkan.`);
          this.form.reset();
          this.showForm.set(false);
          this.load();
        },
        error: (err: unknown) => this.error.set(errorMessage(err)),
      });
  }
}
