import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { AuthService } from './core/auth.service';
import { authGuard, guestGuard, roleGuard } from './core/guards';
import { Shell } from './layout/shell';
import { DashboardPage } from './pages/dashboard';
import { LoanDetailPage } from './pages/loan-detail';
import { LoansPage } from './pages/loans';
import { LoginPage } from './pages/login';
import { MemberDetailPage } from './pages/member-detail';
import { MembersPage } from './pages/members';
import { MePage } from './pages/me';
import { ReportsPage } from './pages/reports';

export const routes: Routes = [
  { path: 'login', component: LoginPage, canActivate: [guestGuard] },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: () => inject(AuthService).home() },
      { path: 'dashboard', component: DashboardPage, canActivate: [roleGuard('ADMIN', 'TELLER')] },
      { path: 'members', component: MembersPage, canActivate: [roleGuard('ADMIN', 'TELLER')] },
      { path: 'members/:id', component: MemberDetailPage, canActivate: [roleGuard('ADMIN', 'TELLER')] },
      { path: 'loans', component: LoansPage, canActivate: [roleGuard('ADMIN', 'TELLER')] },
      { path: 'loans/:id', component: LoanDetailPage, canActivate: [roleGuard('ADMIN', 'TELLER')] },
      { path: 'reports', component: ReportsPage, canActivate: [roleGuard('ADMIN')] },
      { path: 'me', component: MePage, canActivate: [roleGuard('MEMBER')] },
    ],
  },
  { path: '**', redirectTo: '' },
];
