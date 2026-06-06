'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;

declare global {
  interface Window {
    google?: any;
    AppleID?: any;
  }
}

export function SocialAuthButtons() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<null | 'apple'>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [appleReady, setAppleReady] = useState(false);

  const completeAuth = useCallback(
    (res: any) => {
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      toast.success('Welcome to the phantom network.');
      router.push('/dashboard');
    },
    [router, setAuth],
  );

  // --- Google Identity Services -------------------------------------------
  const handleGoogleCredential = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) return;
      try {
        const res = await api.post('/auth/google', { idToken: response.credential });
        completeAuth(res);
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Google sign-in failed');
      }
    },
    [completeAuth],
  );

  const initGoogle = useCallback(() => {
    if (!GOOGLE_CLIENT_ID || !window.google || !googleBtnRef.current) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });
    googleBtnRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      type: 'standard',
      theme: 'filled_black',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'center',
      width: googleBtnRef.current.offsetWidth || 360,
    });
  }, [handleGoogleCredential]);

  useEffect(() => {
    if (googleReady) initGoogle();
  }, [googleReady, initGoogle]);

  // --- Sign in with Apple --------------------------------------------------
  const initApple = useCallback(() => {
    if (!APPLE_CLIENT_ID || !window.AppleID) return;
    window.AppleID.auth.init({
      clientId: APPLE_CLIENT_ID,
      scope: 'name email',
      redirectURI:
        process.env.NEXT_PUBLIC_APP_URL || window.location.origin,
      usePopup: true,
    });
  }, []);

  useEffect(() => {
    if (appleReady) initApple();
  }, [appleReady, initApple]);

  const handleApple = useCallback(async () => {
    if (!window.AppleID) return;
    setPending('apple');
    try {
      const data = await window.AppleID.auth.signIn();
      const idToken = data?.authorization?.id_token;
      if (!idToken) throw new Error('No Apple token');
      const res = await api.post('/auth/apple', {
        idToken,
        firstName: data?.user?.name?.firstName,
        lastName: data?.user?.name?.lastName,
      });
      completeAuth(res);
    } catch (err: any) {
      // The user cancelling the popup throws a benign error we can ignore.
      if (err?.error !== 'popup_closed_by_user' && err?.error !== 'user_cancelled_authorize') {
        toast.error(err.response?.data?.message || 'Apple sign-in failed');
      }
    } finally {
      setPending(null);
    }
  }, [completeAuth]);

  if (!GOOGLE_CLIENT_ID && !APPLE_CLIENT_ID) return null;

  return (
    <div className="mt-6">
      {GOOGLE_CLIENT_ID && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onLoad={() => setGoogleReady(true)}
        />
      )}
      {APPLE_CLIENT_ID && (
        <Script
          src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
          strategy="afterInteractive"
          onLoad={() => setAppleReady(true)}
        />
      )}

      <div className="flex items-center gap-3 mb-5">
        <span className="h-px flex-1 bg-purple/15" />
        <span className="label-ghost">or continue with</span>
        <span className="h-px flex-1 bg-purple/15" />
      </div>

      <div className="space-y-3">
        {GOOGLE_CLIENT_ID && (
          <div className="flex justify-center overflow-hidden rounded-lg" ref={googleBtnRef} />
        )}

        {APPLE_CLIENT_ID && (
          <button
            type="button"
            onClick={handleApple}
            disabled={pending === 'apple'}
            className="btn-ghost w-full flex items-center justify-center gap-2 font-heading"
          >
            {pending === 'apple' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4 fill-current" viewBox="0 0 384 512" aria-hidden="true">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
              </svg>
            )}
            Apple
          </button>
        )}
      </div>
    </div>
  );
}
