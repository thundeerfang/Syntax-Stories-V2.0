'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { inviteApi, type InviteResolveValid } from '@/api/invite';
import {
  normalizeReferralCode,
  readPendingReferralCode,
  referralCodeFormatMessage,
  writePendingReferralCode,
} from '@/lib/referral/referralCode';

export type ReferralValidationState = 'idle' | 'checking' | 'valid' | 'invalid' | 'format-error';

type UseSignupReferralCodeArgs = {
  isOpen: boolean;
};

export function useSignupReferralCode({ isOpen }: UseSignupReferralCodeArgs) {
  const [referralInput, setReferralInput] = useState('');
  const [validationState, setValidationState] = useState<ReferralValidationState>('idle');
  const [referrer, setReferrer] = useState<InviteResolveValid | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const resetReferralState = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    requestIdRef.current += 1;
    setReferralInput('');
    setValidationState('idle');
    setReferrer(null);
    setErrorMessage(null);
  }, []);

  const runResolve = useCallback(async (raw: string) => {
    const normalized = normalizeReferralCode(raw);
    if (!normalized) {
      const formatMsg = referralCodeFormatMessage(raw);
      setValidationState(formatMsg ? 'format-error' : 'idle');
      setReferrer(null);
      setErrorMessage(formatMsg);
      writePendingReferralCode(null);
      return false;
    }

    const requestId = ++requestIdRef.current;
    setValidationState('checking');
    setErrorMessage(null);
    setReferrer(null);

    try {
      const out = await inviteApi.resolveCode(normalized);
      if (requestId !== requestIdRef.current) return false;

      if (!out.valid) {
        setValidationState('invalid');
        setErrorMessage('This referral code was not found. Check the code and try again.');
        writePendingReferralCode(null);
        return false;
      }

      setValidationState('valid');
      setReferrer(out);
      setErrorMessage(null);
      writePendingReferralCode(normalized);
      return true;
    } catch {
      if (requestId !== requestIdRef.current) return false;
      setValidationState('invalid');
      setErrorMessage('Could not verify referral code. Try again in a moment.');
      writePendingReferralCode(null);
      return false;
    }
  }, []);

  const setReferralInputValue = useCallback(
    (next: string) => {
      const upper = next.toUpperCase();
      setReferralInput(upper);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      const trimmed = upper.trim();
      if (!trimmed) {
        requestIdRef.current += 1;
        setValidationState('idle');
        setReferrer(null);
        setErrorMessage(null);
        writePendingReferralCode(null);
        return;
      }

      const formatMsg = referralCodeFormatMessage(trimmed);
      if (formatMsg && trimmed.length >= 8) {
        setValidationState('format-error');
        setReferrer(null);
        setErrorMessage(formatMsg);
        writePendingReferralCode(null);
        return;
      }

      if (trimmed.length < 8) {
        setValidationState('idle');
        setReferrer(null);
        setErrorMessage(null);
        writePendingReferralCode(null);
        return;
      }

      debounceRef.current = setTimeout(() => {
        void runResolve(trimmed);
      }, 450);
    },
    [runResolve]
  );

  const ensureReferralReadyForSignup = useCallback(async (): Promise<boolean> => {
    const trimmed = referralInput.trim();
    if (!trimmed) {
      writePendingReferralCode(null);
      return true;
    }

    if (validationState === 'valid' && referrer) {
      writePendingReferralCode(normalizeReferralCode(trimmed));
      return true;
    }

    if (validationState === 'checking') {
      setErrorMessage('Still verifying referral code…');
      return false;
    }

    return runResolve(trimmed);
  }, [referralInput, validationState, referrer, runResolve]);

  useEffect(() => {
    if (!isOpen) {
      resetReferralState();
      return;
    }

    const pending = readPendingReferralCode();
    if (pending) {
      setReferralInput(pending);
      void runResolve(pending);
    }
  }, [isOpen, resetReferralState, runResolve]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const resolvedCode = normalizeReferralCode(referralInput);

  return {
    referralInput,
    setReferralInputValue,
    validationState,
    referrer,
    errorMessage,
    resolvedCode,
    ensureReferralReadyForSignup,
    referralBlocksSignup:
      referralInput.trim().length > 0 &&
      validationState !== 'valid' &&
      validationState !== 'idle',
  };
}
