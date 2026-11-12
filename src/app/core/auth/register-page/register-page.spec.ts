import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Auth } from '../auth';
import { RegisterPage } from './register-page';

describe('RegisterPage', () => {
  let fixture: ComponentFixture<RegisterPage>;
  let signUp: ReturnType<typeof vi.fn>;
  let signOut: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Replace network requests and navigation so each outcome can be tested independently.
    signUp = vi.fn().mockResolvedValue({ data: { session: {} }, error: null });
    signOut = vi.fn().mockResolvedValue({ error: null });
    await TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: { signUp, signOutLocal: signOut } },
      ],
    }).compileComponents();

    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(RegisterPage);
    await fixture.whenStable();
  });

  function setValue(selector: string, value: string): void {
    const element: HTMLInputElement | HTMLSelectElement = fixture.nativeElement.querySelector(selector);
    element.value = value;
    // Dispatching input tells Signal Forms about the changed DOM value.
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function fillForm(): void {
    setValue('input[autocomplete="name"]', ' Test Person ');
    setValue('select', 'F');
    setValue('input[type="email"]', 'person@example.com');
    const passwords: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="password"]');
    passwords.forEach((element) => {
      element.value = 'secret1';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function submitForm(): void {
    const element: HTMLFormElement = fixture.nativeElement.querySelector('form');
    element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }

  it('shows required errors on submission and associates each with its field', async () => {
    submitForm();
    await fixture.whenStable();

    const fields: NodeListOf<HTMLInputElement | HTMLSelectElement> =
      fixture.nativeElement.querySelectorAll('input, select');
    const errors: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('mat-error');
    expect(errors).toHaveLength(5);
    fields.forEach((field, index) => {
      expect(field.getAttribute('aria-describedby')).toContain(errors[index].id);
    });
    expect(signUp).not.toHaveBeenCalled();
  });

  it('validates email, password length, matching passwords and blank names', async () => {
    fillForm();
    setValue('input[autocomplete="name"]', '  ');
    setValue('input[type="email"]', 'wrong');
    const passwords: NodeListOf<HTMLInputElement> = fixture.nativeElement.querySelectorAll('input[type="password"]');
    passwords[0].value = 'short';
    passwords[0].dispatchEvent(new Event('input', { bubbles: true }));
    submitForm();
    await fixture.whenStable();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Enter your full name.');
    expect(text).toContain('Enter a valid email address.');
    expect(text).toContain('Use at least 6 characters.');
    expect(text).toContain('Passwords do not match.');
    expect(signUp).not.toHaveBeenCalled();
  });

  it('creates a person with gender, signs out locally, and goes to login', async () => {
    fillForm();
    submitForm();
    await fixture.whenStable();

    expect(signUp).toHaveBeenCalledWith('person@example.com', 'secret1', 'Test Person', 'F');
    expect(signOut).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('shows a confirmation notice and does not sign out or navigate without a session', async () => {
    signUp.mockResolvedValueOnce({ data: { session: null }, error: null });
    fillForm();
    submitForm();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('check your email');
    expect(signOut).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('prevents duplicate submissions while waiting', async () => {
    // Keep signup pending until the test has attempted a second submission.
    let finish!: (value: { data: { session: null }; error: null }) => void;
    signUp.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    fillForm();
    submitForm();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    submitForm();
    expect(signUp).toHaveBeenCalledOnce();
    finish({ data: { session: null }, error: null });
    await fixture.whenStable();
  });

  it('reports signup failures without signing out', async () => {
    signUp.mockResolvedValueOnce({ data: { session: null }, error: { message: 'Rejected' } });
    fillForm();
    submitForm();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Unable to create');
    expect(signOut).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });

  it('reports sign-out failure without allowing a second account creation', async () => {
    signOut.mockResolvedValueOnce({ error: { message: 'Could not sign out' } });
    fillForm();
    submitForm();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('sign-out failed');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();

    // Retry sign-out, not signup, because the account has already been created.
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(signUp).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('reports navigation failure without allowing a second account creation', async () => {
    navigate.mockResolvedValueOnce(false);
    fillForm();
    submitForm();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('could not be opened');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('shows a disabled Google button and a link to login', () => {
    expect(fixture.nativeElement.querySelector('button[type="button"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/login');
  });
});
