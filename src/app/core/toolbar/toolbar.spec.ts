import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Auth } from '../auth/auth';
import { Toolbar } from './toolbar';

describe('Toolbar', () => {
  let fixture: ComponentFixture<Toolbar>;
  let authChange: (event: AuthChangeEvent, session: Session | null) => void;
  const unsubscribe = vi.fn();
  const getAvatarUrl = vi.fn();
  const signOutEverywhere = vi.fn();
  let navigate: ReturnType<typeof vi.spyOn>;
  const session = { user: { id: 'user-1' } } as Session;

  async function flushTimers(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 10));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    getAvatarUrl.mockResolvedValue('/images/woman.png');
    signOutEverywhere.mockResolvedValue({ error: null });
    await TestBed.configureTestingModule({
      imports: [Toolbar],
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            onAuthChanges: (callback: typeof authChange) => {
              authChange = callback;
              return { unsubscribe };
            },
            getAvatarUrl,
            signOutEverywhere,
          },
        },
      ],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Toolbar);
    await fixture.whenStable();
  });

  it('loads the user avatar and exposes the account menu', async () => {
    authChange('INITIAL_SESSION', session);
    await flushTimers();
    expect(getAvatarUrl).toHaveBeenCalledWith('user-1');
    const image: HTMLImageElement = fixture.nativeElement.querySelector('.avatar');
    expect(image.getAttribute('src')).toBe('/images/woman.png');
    expect(image.alt).toBe('');

    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatMenuHarness.with({ selector: '[aria-label="Open account menu"]' }),
    );
    await menu.open();
    const items = await menu.getItems();
    expect(await Promise.all(items.map((item) => item.getText()))).toEqual(['Your profile', 'Log out']);
    expect(await (await items[0].host()).getAttribute('href')).toBe('/profile');
  });

  it('signs out globally and navigates to login', async () => {
    authChange('INITIAL_SESSION', session);
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatMenuHarness.with({ selector: '[aria-label="Open account menu"]' }),
    );
    await menu.open();
    await menu.clickItem({ text: 'Log out' });
    await fixture.whenStable();
    expect(signOutEverywhere).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('reports sign-out errors without navigating', async () => {
    signOutEverywhere.mockResolvedValue({ error: { message: 'Failed' } });
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(
      MatMenuHarness.with({ selector: '[aria-label="Open account menu"]' }),
    );
    await menu.open();
    await menu.clickItem({ text: 'Log out' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Unable to sign out');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('redirects on session loss and unsubscribes on destruction', async () => {
    authChange('INITIAL_SESSION', session);
    authChange('SIGNED_OUT', null);
    await flushTimers();
    expect(navigate).toHaveBeenCalledWith('/login');
    fixture.destroy();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('redirects when the initial session is missing', async () => {
    authChange('INITIAL_SESSION', null);
    await flushTimers();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('shows a fallback icon when no avatar is available', async () => {
    getAvatarUrl.mockResolvedValue(null);
    authChange('INITIAL_SESSION', session);
    await flushTimers();
    expect(fixture.nativeElement.querySelector('.avatar')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Open account menu"]').textContent).toContain(
      'account_circle',
    );
  });

  it('does not redirect if a new session arrives before the scheduled redirect', async () => {
    authChange('SIGNED_OUT', null);
    authChange('SIGNED_IN', session);
    await flushTimers();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('discards an old avatar response after a different user signs in', async () => {
    let resolveFirst!: (url: string) => void;
    getAvatarUrl.mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)));
    authChange('SIGNED_IN', session);
    await flushTimers();
    authChange('SIGNED_IN', { user: { id: 'user-2' } } as Session);
    await flushTimers();
    resolveFirst('/images/man.png');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.avatar').getAttribute('src')).toBe('/images/woman.png');
  });
});
