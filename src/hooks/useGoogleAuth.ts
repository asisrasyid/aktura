import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: object) => void;
        };
      };
    };
  }
}

const SCRIPT_ID = 'google-gsi';

/**
 * Loads the Google Identity Services script and renders the official Google button
 * into the returned containerRef. Works for both Login and Register flows.
 *
 * @param onCredential - called with the raw Google ID token string after user signs in
 */
export function useGoogleAuth(onCredential: (idToken: string) => void) {
  // Use a ref for the callback so the effect never needs to re-run when the handler changes
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = () => {
      if (!window.google || !containerRef.current) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
        callback: (res) => callbackRef.current(res.credential),
      });
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: 348,
        text: 'continue_with',
        logo_alignment: 'left',
      });
    };

    // Script already loaded (e.g. navigating between Login ↔ Register)
    if (document.getElementById(SCRIPT_ID)) {
      init();
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = init;
    document.head.appendChild(script);
  }, []); // run once — callbackRef keeps callback up-to-date

  return containerRef;
}
