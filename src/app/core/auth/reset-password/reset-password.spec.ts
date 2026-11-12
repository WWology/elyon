import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { AuthChangeEvent, createClient, Session } from '@supabase/supabase-js';
import { Auth } from '../auth';
import { Supabase } from '../../supabase';
import { ResetPassword } from './reset-password';

describe('ResetPassword', () => {
  let fixture: ComponentFixture<ResetPassword>;
  let onChange: (event: AuthChangeEvent, session: Session | null) => void;
  const requestPasswordReset = vi.fn();
  const updatePassword = vi.fn();
  const signOutEverywhere = vi.fn();
  const unsubscribe = vi.fn();
  const session: Session = {
    access_token: 'access',
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: 'user-1', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' },
  };

  async function create(recovery = false): Promise<void> {
    TestBed.configureTestingModule({
      imports: [ResetPassword],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { recovery } } } },
        {
          provide: Auth,
          useValue: {
            requestPasswordReset,
            updatePassword,
            signOutEverywhere,
            onAuthChanges: (callback: typeof onChange) => {
              onChange = callback;
              return { unsubscribe };
            },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(ResetPassword);
    await fixture.whenStable();
  }

  function setValue(selector: string, value: string): void {
    const element: HTMLInputElement = fixture.nativeElement.querySelector(selector);
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function submitForm(): void {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  beforeEach(() => {
    vi.resetAllMocks();
    requestPasswordReset.mockResolvedValue({ error: null });
    updatePassword.mockResolvedValue({ error: null });
    signOutEverywhere.mockResolvedValue({ error: null });
  });

  it('validates email and sends a generic recovery notice', async () => {
    await create();
    submitForm();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Enter your email address.');
    expect(requestPasswordReset).not.toHaveBeenCalled();

    setValue('input[type="email"]', 'user@example.com');
    submitForm();
    await fixture.whenStable();
    expect(requestPasswordReset).toHaveBeenCalledWith(
      'user@example.com',
      `${document.defaultView?.location.origin}/resetpassword/update`,
    );
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('If an account exists');
  });

  it('reports request failures and allows retry', async () => {
    await create();
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    requestPasswordReset.mockResolvedValueOnce({ error: new Error('Failed') });
    setValue('input[type="email"]', 'user@example.com');
    submitForm();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Unable to request');
    submitForm();
    await fixture.whenStable();
    expect(requestPasswordReset).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });

  it('prevents duplicate email requests while one is pending', async () => {
    await create();
    let finish!: (value: { error: null }) => void;
    requestPasswordReset.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    setValue('input[type="email"]', 'user@example.com');
    submitForm();
    await fixture.whenStable();
    submitForm();
    expect(requestPasswordReset).toHaveBeenCalledOnce();
    finish({ error: null });
    await fixture.whenStable();
  });

  it('does not permit password changes with an ordinary session or an expired link', async () => {
    await create(true);
    onChange('INITIAL_SESSION', session);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('request a new one');
    expect(updatePassword).not.toHaveBeenCalled();
    fixture.destroy();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('validates matching passwords after a recovery event', async () => {
    await create(true);
    onChange('PASSWORD_RECOVERY', session);
    await fixture.whenStable();
    const fields: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="password"]');
    fields[0].value = 'short';
    fields[0].dispatchEvent(new Event('input', { bubbles: true }));
    fields[1].value = 'different';
    fields[1].dispatchEvent(new Event('input', { bubbles: true }));
    submitForm();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Use at least 6 characters.');
    expect(fixture.nativeElement.textContent).toContain('Passwords do not match.');
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('updates the password, signs out globally, and navigates to login', async () => {
    await create(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    onChange('PASSWORD_RECOVERY', session);
    await fixture.whenStable();
    const fields: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="password"]');
    fields.forEach((field) => {
      field.value = 'newsecret';
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    submitForm();
    await fixture.whenStable();
    expect(updatePassword).toHaveBeenCalledWith('newsecret');
    expect(signOutEverywhere).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('retries failed sign-out without updating the password again', async () => {
    await create(true);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    signOutEverywhere.mockResolvedValueOnce({ error: new Error('Failed') });
    onChange('PASSWORD_RECOVERY', session);
    await fixture.whenStable();
    const fields: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="password"]');
    fields.forEach((field) => {
      field.value = 'newsecret';
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    submitForm();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('sign-out failed');
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(updatePassword).toHaveBeenCalledOnce();
    expect(signOutEverywhere).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith('/login');
    log.mockRestore();
  });

  it('reports a password update error without signing out', async () => {
    await create(true);
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    updatePassword.mockResolvedValueOnce({ error: new Error('Failed') });
    onChange('PASSWORD_RECOVERY', session);
    await fixture.whenStable();
    const fields: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="password"]');
    fields.forEach((field) => {
      field.value = 'newsecret';
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    submitForm();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Unable to update');
    expect(signOutEverywhere).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('retries navigation without updating the password or signing out again', async () => {
    await create(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    onChange('PASSWORD_RECOVERY', session);
    await fixture.whenStable();
    const fields: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="password"]');
    fields.forEach((field) => {
      field.value = 'newsecret';
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    submitForm();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('could not be opened');
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(updatePassword).toHaveBeenCalledOnce();
    expect(signOutEverywhere).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it('disables recovery when the session changes', async () => {
    await create(true);
    onChange('PASSWORD_RECOVERY', session);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    onChange('SIGNED_OUT', null);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
});

describe('recovery callback with the Supabase client', () => {
  it('enables the password form when the client consumes an implicit recovery link', async () => {
    const originalUrl = window.location.href;
    window.history.replaceState(
      null,
      '',
      '/resetpassword/update#access_token=access&refresh_token=refresh&expires_in=3600&token_type=bearer&type=recovery',
    );
    const user = { id: 'user-1', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' };
    const client = createClient('http://127.0.0.1:54321', 'test-publishable-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: vi.fn().mockResolvedValue(new Response(JSON.stringify(user), { status: 200 })) },
    });
    try {
      TestBed.configureTestingModule({
        imports: [ResetPassword],
        providers: [
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { snapshot: { data: { recovery: true } } } },
          { provide: Supabase, useValue: { supabase: client } },
        ],
      });
      const fixture = TestBed.createComponent(ResetPassword);
      await vi.waitFor(async () => {
        await fixture.whenStable();
        expect(fixture.nativeElement.querySelector('input[type="password"]')).not.toBeNull();
      });
      fixture.destroy();
    } finally {
      window.history.replaceState(null, '', originalUrl);
    }
  });
});
