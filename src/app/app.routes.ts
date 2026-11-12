import { Routes } from '@angular/router';
import { DashboardComponent } from './core/dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
  },
  {
    path: 'login',
    loadComponent: () => import('./core/auth/login-page/login-page').then((module) => module.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./core/auth/register-page/register-page').then((module) => module.RegisterPage),
  },
  {
    path: 'resetpassword',
    loadComponent: () => import('./core/auth/resetpassword/resetpassword').then((module) => module.Resetpassword),
  },
];
