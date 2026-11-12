import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

export const publicOnlyGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (!(await auth.getUser())) return true;

  const currentPath = router.routerState.snapshot.root.firstChild?.routeConfig?.path;
  if (!router.navigated || currentPath === undefined || currentPath === 'login' || currentPath === 'register') {
    return router.parseUrl('/');
  }

  // Cancel the attempted navigation to keep the current page and its state intact.
  return false;
};
