import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Auth } from '../auth';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let signIn: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Replace authentication and navigation with test doubles; no real sign-in occurs.
    signIn = vi.fn().mockResolvedValue({ error: null });
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: Auth, useValue: { signInWithEmailPassword: signIn } }],
    }).compileComponents();

    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function setInput(type: string, value: string): void {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(`input[type="${type}"]`);
    input.value = value;
    // Dispatching the event lets the form receive the new value, as it would from a user.
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function submitForm(): void {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  it('keeps Google sign-in disabled', () => {
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));

    expect(buttons).toHaveLength(2);
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(true);
  });

  it('shows required errors on submit and does not sign in', async () => {
    submitForm();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Enter your email address.');
    expect(fixture.nativeElement.textContent).toContain('Enter your password.');
    const errors: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('mat-error');
    const inputs: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input');
    expect(errors).toHaveLength(2);
    expect(inputs[0].getAttribute('aria-describedby')).toContain(errors[0].id);
    expect(inputs[1].getAttribute('aria-describedby')).toContain(errors[1].id);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('shows an email error after blur and associates it with the input', async () => {
    setInput('email', 'not-an-email');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="email"]');
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    const error: HTMLElement = fixture.nativeElement.querySelector('mat-error');
    expect(error.textContent).toContain('Enter a valid email address.');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('signs in with valid credentials and navigates to the dashboard', async () => {
    setInput('email', 'person@example.com');
    setInput('password', 'secret');
    submitForm();
    await fixture.whenStable();

    expect(signIn).toHaveBeenCalledWith('person@example.com', 'secret');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('prevents duplicate submissions while sign-in is pending', async () => {
    // Keep the request pending until the test explicitly resolves it.
    let finishSignIn!: (result: { error: null }) => void;
    signIn.mockReturnValue(new Promise((resolve) => (finishSignIn = resolve)));
    setInput('email', 'person@example.com');
    setInput('password', 'secret');
    submitForm();
    await fixture.whenStable();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button[type="submit"]');
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Signing in');
    submitForm();
    expect(signIn).toHaveBeenCalledTimes(1);

    finishSignIn({ error: null });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows a sign-in failure and allows a retry', async () => {
    signIn.mockResolvedValueOnce({ error: { message: 'Invalid credentials' } });
    setInput('email', 'person@example.com');
    setInput('password', 'wrong');
    submitForm();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Unable to sign in');
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);

    setInput('password', 'correct');
    submitForm();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('reports an unexpected sign-in failure', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    signIn.mockRejectedValueOnce(new Error('Network failed'));
    setInput('email', 'person@example.com');
    setInput('password', 'secret');
    submitForm();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('try again');
    expect(log).toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('reports navigation failure separately after successful sign-in', async () => {
    navigate.mockResolvedValueOnce(false);
    setInput('email', 'person@example.com');
    setInput('password', 'secret');
    submitForm();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Signed in, but unable to open the dashboard.',
    );
  });

  it('links to registration and password reset', () => {
    const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a'));

    expect(links.some((link) => link.getAttribute('href') === '/register')).toBe(true);
    expect(links.some((link) => link.getAttribute('href') === '/resetpassword')).toBe(true);
  });
});
