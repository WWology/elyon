import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes, withAppShell } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { DashboardComponent } from './core/dashboard/dashboard.component';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes), withAppShell(DashboardComponent))],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
