import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { Role, Session } from './models';

const STORAGE_KEY = 'coopledger.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = signal<Session | null>(readSession());

  readonly user = this.session.asReadonly();
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly role = computed<Role | null>(() => this.session()?.role ?? null);

  login(username: string, password: string): Observable<Session> {
    return this.http
      .post<Session>('/api/auth/login', { username, password })
      .pipe(tap((session) => this.store(session)));
  }

  logout(): void {
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
    void this.router.navigateByUrl('/login');
  }

  token(): string | null {
    return this.session()?.token ?? null;
  }

  /** Landing route for the current role. */
  home(): string {
    return this.role() === 'MEMBER' ? '/me' : '/dashboard';
  }

  private store(session: Session): void {
    this.session.set(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
