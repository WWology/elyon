import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Let public-only guards recheck auth when navigating to the current auth URL.
    provideRouter(routes, withRouterConfig({ onSameUrlNavigation: 'reload' })), provideClientHydration()
  ]
};
