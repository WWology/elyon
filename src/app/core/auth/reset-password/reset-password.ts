import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { email, form, FormField, minLength, required, submit, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../auth';

@Component({
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule, RouterLink],
  selector: 'notitia-resetpassword',
  styleUrls: ['../login-page/login-page.css', './reset-password.css'],
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private readonly document = inject(DOCUMENT);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  // Signal Forms synchronizes these models with the inputs in the template.
  private readonly emailDetails = signal({ email: '' });
  private readonly passwordDetails = signal({ password: '', confirmPassword: '' });
  private recoveryUserId: string | null = null;

  // Route data distinguishes the email request from the link's password update page.
  protected readonly recoveryPage = this.route.snapshot.data['recovery'] === true;
  protected readonly recoveryReady = signal(false);
  protected readonly emailSent = signal(false);
  protected readonly passwordUpdated = signal(false);
  protected readonly finishing = signal(false);
  protected readonly signedOut = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly emailForm = form(this.emailDetails, (path) => {
    required(path.email, { message: 'Enter your email address.' });
    email(path.email, { message: 'Enter a valid email address.' });
  });

  protected readonly passwordForm = form(this.passwordDetails, (path) => {
    required(path.password, { message: 'Enter a password.' });
    minLength(path.password, 6, { message: 'Use at least 6 characters.' });
    required(path.confirmPassword, { message: 'Confirm your password.' });
    // valueOf tracks the password field, so changing it rechecks confirmation.
    validate(path.confirmPassword, ({ value, valueOf }) =>
      !value() || value() === valueOf(path.password)
        ? undefined
        : { kind: 'passwordMismatch', message: 'Passwords do not match.' },
    );
  });

  constructor() {
    if (!this.recoveryPage) return;

    // Only a recovery event, not an ordinary signed-in session, enables the reset form.
    const subscription = this.auth.onAuthChanges((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        this.recoveryUserId = session.user.id;
        this.recoveryReady.set(true);
      } else if (this.recoveryUserId && session?.user.id !== this.recoveryUserId) {
        // Stop accepting changes if the recovery user signs out or the session changes user.
        this.recoveryUserId = null;
        this.recoveryReady.set(false);
      }
    });
    // Remove the listener when this page is destroyed.
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  protected async requestReset(event: Event): Promise<void> {
    // Keep the browser on this page and ignore repeated submissions.
    event.preventDefault();
    if (this.emailForm().submitting() || this.emailSent()) return;
    this.errorMessage.set('');

    // submit marks fields touched and calls this action only when the form is valid.
    await submit(this.emailForm, async () => {
      try {
        // Supabase must allow this callback URL in its redirect configuration.
        const origin = this.document.defaultView?.location.origin;
        if (!origin) throw new Error('Cannot determine the password recovery URL');
        const { error } = await this.auth.requestPasswordReset(
          this.emailDetails().email.trim(),
          `${origin}/resetpassword/update`,
        );
        if (error) {
          console.error('Password reset request failed', error);
          this.errorMessage.set('Unable to request a reset link. Please try again later.');
          return;
        }
        this.emailSent.set(true);
      } catch (error) {
        console.error('Password reset request failed', error);
        this.errorMessage.set('Unable to request a reset link. Please try again later.');
      }
    });
  }

  protected async updatePassword(event: Event): Promise<void> {
    event.preventDefault();
    // Require a recovery event and prevent duplicate or completed password updates.
    if (!this.recoveryReady() || this.passwordForm().submitting() || this.passwordUpdated()) return;
    this.errorMessage.set('');

    await submit(this.passwordForm, async () => {
      try {
        const { error } = await this.auth.updatePassword(this.passwordDetails().password);
        if (error) {
          console.error('Password update failed', error);
          this.errorMessage.set('Unable to update your password. The link may have expired; request a new one.');
          return;
        }
        // Preserve the completed step for retries and clear the password from the form model.
        this.passwordUpdated.set(true);
        this.passwordDetails.set({ password: '', confirmPassword: '' });
      } catch (error) {
        console.error('Password update failed', error);
        this.errorMessage.set('Unable to update your password. Please try again.');
        return;
      }
      await this.finishReset();
    });
  }

  protected async finishReset(): Promise<void> {
    // Retrying completion must not update the password a second time.
    if (this.finishing()) return;
    this.finishing.set(true);
    this.errorMessage.set('');
    try {
      // Remember successful global sign-out so a navigation retry does not repeat it.
      if (!this.signedOut()) {
        const { error } = await this.auth.signOutEverywhere();
        if (error) {
          console.error('Sign-out after password reset failed', error);
          this.errorMessage.set('Your password was updated, but sign-out failed. Please try again.');
          return;
        }
        this.signedOut.set(true);
      }
      if (!(await this.router.navigateByUrl('/login'))) {
        this.errorMessage.set('Your password was updated, but the sign-in page could not be opened.');
      }
    } catch (error) {
      console.error('Finishing password reset failed', error);
      this.errorMessage.set(
        this.signedOut()
          ? 'Your password was updated, but the sign-in page could not be opened.'
          : 'Your password was updated, but sign-out failed. Please try again.',
      );
    } finally {
      // Allow another attempt even when sign-out or navigation fails.
      this.finishing.set(false);
    }
  }
}
