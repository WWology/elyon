import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withRouterConfig } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { Auth } from './auth';
import { ProfilePage } from './profile-page/profile-page';
import { LoginPage } from './login-page/login-page';

describe('protected routes', () => {
  const getUser = vi.fn();

  beforeEach(() => {
    getUser.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withRouterConfig({ onSameUrlNavigation: 'reload' })),
        {
          provide: Auth,
          useValue: { getUser, onAuthChanges: () => ({ unsubscribe: () => undefined }) },
        },
      ],
    });
  });

  it('redirects unauthenticated dashboard and profile visits to login', async () => {
    getUser.mockResolvedValue(null);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/', LoginPage);
    expect(TestBed.inject(Router).url).toBe('/login');
    await harness.navigateByUrl('/profile', LoginPage);
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('allows authenticated users to open the profile page', async () => {
    getUser.mockResolvedValue({ id: 'user-1' });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/profile', ProfilePage);
    expect(TestBed.inject(Router).url).toBe('/profile');
  });

  it('leaves registration accessible without a session', async () => {
    getUser.mockResolvedValue(null);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/register');
    expect(TestBed.inject(Router).url).toBe('/register');
    expect(getUser).toHaveBeenCalledOnce();
    await harness.navigateByUrl('/resetpassword');
    expect(TestBed.inject(Router).url).toBe('/resetpassword');
    expect(getUser).toHaveBeenCalledOnce();
  });

  it.each(['/login', '/register'])('redirects signed-in initial visits to %s to the dashboard', async (url) => {
    getUser.mockResolvedValue({ id: 'user-1' });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it.each(['/login', '/register'])('keeps the previous page when a signed-in user visits %s', async (url) => {
    getUser.mockResolvedValue({ id: 'user-1' });
    const harness = await RouterTestingHarness.create();
    const profile = await harness.navigateByUrl('/profile?tab=details#section', ProfilePage);

    await harness.navigateByUrl(url);
    expect(TestBed.inject(Router).url).toBe('/profile?tab=details#section');
    expect(harness.routeDebugElement?.componentInstance).toBe(profile);
  });

  it.each([
    ['/login', '/register'],
    ['/register', '/login'],
    ['/login', '/login'],
    ['/register', '/register'],
  ])('redirects from %s to the dashboard if signed in before navigating to %s', async (current, target) => {
    getUser.mockResolvedValue(null);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(current);
    getUser.mockResolvedValue({ id: 'user-1' });

    await harness.navigateByUrl(target);
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('leaves password reset accessible to signed-in users', async () => {
    getUser.mockResolvedValue({ id: 'user-1' });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/resetpassword');
    expect(TestBed.inject(Router).url).toBe('/resetpassword');
    expect(getUser).not.toHaveBeenCalled();
  });
});
