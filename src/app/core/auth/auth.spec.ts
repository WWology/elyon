import { TestBed } from '@angular/core/testing';
import { AuthSessionMissingError } from '@supabase/supabase-js';
import { Supabase } from '../supabase';
import { Auth } from './auth';

describe('Auth', () => {
  let service: Auth;
  const signUp = vi.fn();
  const signOut = vi.fn();
  const getUser = vi.fn();
  const resetPasswordForEmail = vi.fn();
  const updateUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{
        provide: Supabase,
        useValue: { supabase: { auth: { signUp, signOut, getUser, resetPasswordForEmail, updateUser } } },
      }],
    });
    service = TestBed.inject(Auth);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('treats a missing session as signed out without logging an error', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getUser.mockResolvedValueOnce({ data: { user: null }, error: new AuthSessionMissingError() });

    expect(await service.getUser()).toBeNull();
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('logs other user lookup errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('Lookup failed');
    getUser.mockResolvedValueOnce({ data: { user: null }, error });

    expect(await service.getUser()).toBeNull();
    expect(log).toHaveBeenCalledWith(error);
    log.mockRestore();
  });

  it('passes registration details as Supabase user metadata', () => {
    service.signUp('person@example.com', 'secret1', 'Test Person', 'M');
    expect(signUp).toHaveBeenCalledWith({
      email: 'person@example.com',
      password: 'secret1',
      options: { data: { full_name: 'Test Person', gender: 'M' } },
    });
  });

  it('signs out only the current session', () => {
    service.signOutLocal();
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('signs out all sessions', () => {
    service.signOutEverywhere();
    expect(signOut).toHaveBeenCalledWith({ scope: 'global' });
  });

  it('passes password recovery requests to Supabase', () => {
    service.requestPasswordReset('person@example.com', 'https://example.com/resetpassword/update');
    expect(resetPasswordForEmail).toHaveBeenCalledWith('person@example.com', {
      redirectTo: 'https://example.com/resetpassword/update',
    });
    service.updatePassword('newsecret');
    expect(updateUser).toHaveBeenCalledWith({ password: 'newsecret' });
  });
});
