import { NgOptimizedImage } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../auth/auth';

@Component({
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, RouterLink, NgOptimizedImage],
  selector: 'notitia-toolbar',
  styleUrl: './toolbar.css',
  templateUrl: './toolbar.html',
})
export class Toolbar {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private currentUserId: string | null = null;
  // A new revision makes earlier avatar requests and scheduled redirects outdated.
  private revision = 0;
  private destroyed = false;

  protected readonly avatarUrl = signal<string | null>(null);
  protected readonly errorMessage = signal('');
  protected readonly loggingOut = signal(false);

  constructor() {
    const subscription = this.auth.onAuthChanges((event, session) => {
      if (!session) {
        this.currentUserId = null;
        this.avatarUrl.set(null);
        const revision = ++this.revision;
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          // Defer navigation until after the auth callback, and skip it if a new session arrives.
          setTimeout(() => {
            if (!this.destroyed && revision === this.revision) void this.goToLogin();
          });
        }
        return;
      }

      if (session.user.id !== this.currentUserId || event === 'USER_UPDATED') {
        this.currentUserId = session.user.id;
        this.avatarUrl.set(null);
        const revision = ++this.revision;
        // Run the avatar request after the auth callback has finished.
        setTimeout(() => void this.loadAvatar(session.user.id, revision));
      }
    });

    // Stop listening and invalidate pending work when Angular removes this toolbar.
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.revision++;
      subscription.unsubscribe();
    });
  }

  protected async logout(): Promise<void> {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.errorMessage.set('');
    try {
      const { error } = await this.auth.signOutEverywhere();
      if (error) {
        this.errorMessage.set('Unable to sign out. Please try again.');
        return;
      }
      await this.goToLogin();
    } catch (error) {
      console.error('Sign-out failed', error);
      this.errorMessage.set('Unable to sign out. Please try again.');
    } finally {
      this.loggingOut.set(false);
    }
  }

  protected avatarFailed(): void {
    console.error('Unable to load the account avatar');
    this.avatarUrl.set(null);
  }

  private async loadAvatar(userId: string, revision: number): Promise<void> {
    // The scheduled request may already be outdated before it starts.
    if (this.destroyed || revision !== this.revision) return;
    try {
      const url = await this.auth.getAvatarUrl(userId);
      // Check again: auth state may have changed while the request was in progress.
      if (!this.destroyed && revision === this.revision) this.avatarUrl.set(url);
    } catch (error) {
      console.error('Unable to retrieve the account avatar', error);
    }
  }

  private async goToLogin(): Promise<void> {
    if (this.destroyed || this.router.url === '/login') return;
    try {
      if (!(await this.router.navigateByUrl('/login'))) {
        this.errorMessage.set('Unable to open the sign-in page.');
      }
    } catch (error) {
      console.error('Navigation to sign-in failed', error);
      this.errorMessage.set('Unable to open the sign-in page.');
    }
  }
}
