import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';
import { publicOnlyGuard } from './core/auth/public-only-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./core/dashboard/dashboard.component').then((module) => module.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./core/auth/profile-page/profile-page').then((module) => module.ProfilePage),
  },
  {
    path: 'login',
    canActivate: [publicOnlyGuard],
    runGuardsAndResolvers: 'always',
    loadComponent: () => import('./core/auth/login-page/login-page').then((module) => module.LoginPage),
  },
  {
    path: 'register',
    canActivate: [publicOnlyGuard],
    runGuardsAndResolvers: 'always',
    loadComponent: () => import('./core/auth/register-page/register-page').then((module) => module.RegisterPage),
  },
  {
    path: 'resetpassword',
    loadComponent: () => import('./core/auth/reset-password/reset-password').then((module) => module.ResetPassword),
  },
  {
    path: 'resetpassword/update',
    data: { recovery: true },
    loadComponent: () => import('./core/auth/reset-password/reset-password').then((module) => module.ResetPassword),
  },
];
