import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../auth';

@Component({
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule, RouterLink],
  selector: 'notitia-login-page',
  styleUrl: './login-page.css',
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  // Signal Forms keeps this model in sync with the inputs bound in the template.
  private readonly credentials = signal({ email: '', password: '' });

  protected readonly signInError = signal('');
  // The schema attaches validation rules and messages to each field in the model.
  protected readonly loginForm = form(this.credentials, (path) => {
    required(path.email, { message: 'Enter your email address.' });
    email(path.email, { message: 'Enter a valid email address.' });
    required(path.password, { message: 'Enter your password.' });
  });

  protected async signIn(event: Event): Promise<void> {
    // Keep the browser from reloading the page and ignore repeated submissions.
    event.preventDefault();
    if (this.loginForm().submitting()) return;

    this.signInError.set('');
    // submit marks fields as touched and runs this action only when the form is valid.
    await submit(this.loginForm, async () => {
      const { email, password } = this.credentials();
      try {
        const { error } = await this.auth.signInWithEmailPassword(email, password);
        // Supabase can return an error without throwing an exception.
        if (error) {
          this.signInError.set('Unable to sign in. Check your details and try again.');
          return;
        }
      } catch (error) {
        console.error('Sign-in request failed', error);
        this.signInError.set('Unable to sign in right now. Please try again.');
        return;
      }

      // Navigation can fail even after authentication succeeds, so report it separately.
      try {
        if (!(await this.router.navigateByUrl('/'))) {
          this.signInError.set('Signed in, but unable to open the dashboard.');
        }
      } catch (error) {
        console.error('Navigation after sign-in failed', error);
        this.signInError.set('Signed in, but unable to open the dashboard.');
      }
    });
  }
}
