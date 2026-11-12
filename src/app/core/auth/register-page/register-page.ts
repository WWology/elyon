import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, minLength, required, submit, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../auth';

@Component({
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule, RouterLink],
  selector: 'notitia-register-page',
  styleUrls: ['../login-page/login-page.css', './register-page.css'],
  templateUrl: './register-page.html',
})
export class RegisterPage {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  // Signal Forms keeps this model in sync with the inputs bound in the template.
  private readonly details = signal({
    fullName: '',
    gender: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  protected readonly errorMessage = signal('');
  protected readonly confirmationPending = signal(false);
  protected readonly accountCreated = signal(false);
  protected readonly signingOut = signal(false);
  protected readonly signedOut = signal(false);
  // The schema attaches validation rules and messages to each field.
  protected readonly registerForm = form(this.details, (path) => {
    required(path.fullName, { message: 'Enter your full name.' });
    // A name containing only spaces should not pass the required check.
    validate(path.fullName, ({ value }) =>
      value().trim() ? undefined : { kind: 'required', message: 'Enter your full name.' },
    );
    required(path.gender, { message: 'Select your gender.' });
    validate(path.gender, ({ value }) =>
      !value() || value() === 'M' || value() === 'F'
        ? undefined
        : { kind: 'invalidGender', message: 'Select a valid gender.' },
    );
    required(path.email, { message: 'Enter your email address.' });
    email(path.email, { message: 'Enter a valid email address.' });
    required(path.password, { message: 'Enter a password.' });
    minLength(path.password, 6, { message: 'Use at least 6 characters.' });
    required(path.confirmPassword, { message: 'Confirm your password.' });
    // valueOf reads the other field so confirmation also updates when the password changes.
    validate(path.confirmPassword, ({ value, valueOf }) =>
      !value() || value() === valueOf(path.password)
        ? undefined
        : { kind: 'passwordMismatch', message: 'Passwords do not match.' },
    );
  });

  protected async register(event: Event): Promise<void> {
    // Prevent a page reload and ignore duplicate submissions or a completed confirmation flow.
    event.preventDefault();
    if (this.registerForm().submitting() || this.confirmationPending()) return;
    this.errorMessage.set('');

    // submit marks fields as touched and runs this action only when the form is valid.
    await submit(this.registerForm, async () => {
      const { email, password, fullName, gender } = this.details();
      // Check again to narrow the string to the values accepted by the auth service.
      if (gender !== 'M' && gender !== 'F') {
        this.errorMessage.set('Select a valid gender.');
        return;
      }

      try {
        const { data, error } = await this.auth.signUp(email.trim(), password, fullName.trim(), gender);
        // Supabase can return an error without throwing an exception.
        if (error) {
          this.errorMessage.set('Unable to create your account. Please check your details and try again.');
          return;
        }
        // A missing session can mean email confirmation is needed; it does not prove creation.
        if (!data.session) {
          this.confirmationPending.set(true);
          return;
        }
        this.accountCreated.set(true);
      } catch (error) {
        console.error('Registration request failed', error);
        this.errorMessage.set('Unable to complete registration. Please try signing in or try again later.');
        return;
      }

      await this.finishRegistration();
    });
  }

  protected async finishRegistration(): Promise<void> {
    // A retry resumes this step instead of submitting another signup request.
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.errorMessage.set('');
    try {
      // Sign out only this browser's session; do not sign out the user's other devices.
      // Remember success so a navigation retry does not sign out again.
      if (!this.signedOut()) {
        const { error } = await this.auth.signOutLocal();
        if (error) {
          this.errorMessage.set('Your account was created, but sign-out failed. Please try again.');
          return;
        }
        this.signedOut.set(true);
      }

      if (!(await this.router.navigateByUrl('/login'))) {
        this.errorMessage.set('Your account was created, but the sign-in page could not be opened.');
      }
    } catch (error) {
      console.error('Finishing registration failed', error);
      this.errorMessage.set(
        this.signedOut()
          ? 'Your account was created, but the sign-in page could not be opened.'
          : 'Your account was created, but sign-out failed. Please try again.',
      );
    } finally {
      this.signingOut.set(false);
    }
  }
}
