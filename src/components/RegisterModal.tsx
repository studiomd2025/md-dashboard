import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import type { AccessRequestRecord } from '../types';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  userDisplayName?: string | null;
  isAdmin: boolean;
  ownRequest: AccessRequestRecord | null;
  authError?: string;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onSubmitRequest: (note: string) => Promise<void>;
  onWithdrawRequest: () => Promise<void>;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userDisplayName,
  isAdmin,
  ownRequest,
  authError,
  onGoogleSignIn,
  onSignOut,
  onSubmitRequest,
  onWithdrawRequest,
}) => {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');
  const [submittedNotice, setSubmittedNotice] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setNote(ownRequest?.note || '');
    setLocalError('');
    setSubmittedNotice('');
  }, [isOpen, ownRequest?.note]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleContinueGoogle = async () => {
    setBusy(true);
    setLocalError('');
    try {
      await onGoogleSignIn();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setLocalError('');
    setSubmittedNotice('');
    try {
      await onSubmitRequest(note);
      setSubmittedNotice(
        'Registration sent! Once an owner approves you in Settings → Team, your account will unlock automatically.'
      );
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Unable to submit registration.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleWithdraw = async () => {
    setBusy(true);
    setLocalError('');
    setSubmittedNotice('');
    try {
      await onWithdrawRequest();
      setNote('');
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Unable to withdraw request.'
      );
    } finally {
      setBusy(false);
    }
  };

  const displayErr = localError || authError;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="aero-glass w-full max-w-md overflow-hidden rounded-3xl border border-white/60 shadow-2xl dark:border-slate-700/80"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/75 px-6 py-4 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:bg-sky-400/20 dark:text-sky-300">
              <UserPlus className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2
                id="register-modal-title"
                className="font-display text-base font-bold text-slate-900 dark:text-white"
              >
                {isAdmin
                  ? 'Co-Manager Access Active'
                  : userEmail
                  ? 'Verify Google Email'
                  : 'Register / Sign In with Google'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Instant shared timeline &amp; broadcast access
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close registration modal"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {displayErr && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/60 dark:text-rose-200">
              {displayErr}
            </div>
          )}

          {submittedNotice && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-200">
              {submittedNotice}
            </div>
          )}

          {isAdmin ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
                  Signed in as {userEmail}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Your account has full co-manager access to post, edit banners, manage countdowns, and collaborate on the shared timeline immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="aero-button-primary w-full rounded-xl px-4 py-2.5 text-xs font-semibold text-white cursor-pointer"
              >
                Open Dashboard
              </button>
            </div>
          ) : !userEmail ? (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                Everyone views the same shared timeline. Sign in with any verified Google account below for instant co-manager access—no manual approval needed.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={handleContinueGoogle}
                className="aero-button-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60 cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                <span>{busy ? 'Connecting...' : 'Continue with Google'}</span>
              </button>
              <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                Once signed in, you can immediately create posts, manage banners, and update countdowns.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/75 px-3.5 py-2.5 dark:border-slate-700/80 dark:bg-slate-900/70">
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {userDisplayName || 'Google Account Verified'}
                  </div>
                  <div className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {userEmail}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <LogOut className="h-3 w-3" />
                  <span>Switch</span>
                </button>
              </div>

              {ownRequest ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-3.5 py-3 text-xs text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock3 className="h-3.5 w-3.5 shrink-0" />
                    <span>Registration Pending Approval</span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    An existing owner can approve your email inside <strong>Settings → Team</strong>. Once approved, this browser updates automatically.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-sky-200/80 bg-sky-50/80 px-3.5 py-2.5 text-xs text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-200 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-sky-600 dark:text-sky-400" />
                  <span>
                    Your Google email is verified. Submit your registration below so an owner can grant you co-manager access to the shared timeline.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Optional Note for Existing Owners
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Co-managing event recaps and banners..."
                  className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="aero-button-primary flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60 cursor-pointer"
                >
                  {busy
                    ? 'Saving...'
                    : ownRequest
                    ? 'Update Registration Note'
                    : 'Submit Registration'}
                </button>
                {ownRequest && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleWithdraw}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
