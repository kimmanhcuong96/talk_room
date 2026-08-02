import { LogIn } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadGoogleIdentity } from "../lib/googleIdentity";

type GoogleSignInButtonProps = {
  disabled: boolean;
  onCredential: (idToken: string) => void;
};

export function GoogleSignInButton({ disabled, onCredential }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const initializedClientIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  const initializeGoogleSignIn = useCallback(async () => {
    if (!clientId) {
      throw new Error("VITE_GOOGLE_CLIENT_ID is not configured.");
    }

    await loadGoogleIdentity();

    if (!window.google?.accounts.id) {
      throw new Error("Google Sign-In is unavailable.");
    }

    if (initializedClientIdRef.current !== clientId) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: (response) => {
          if (response.credential) {
            onCredential(response.credential);
          }
        }
      });
      initializedClientIdRef.current = clientId;
    }

    if (buttonRef.current) {
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        type: "standard",
        shape: "rectangular",
        text: "signin_with",
        width: 280
      });
    }

    setIsReady(true);
  }, [clientId, onCredential]);

  useEffect(() => {
    if (disabled || !clientId) {
      return;
    }

    let cancelled = false;

    initializeGoogleSignIn()
      .then(() => {
        if (cancelled) {
          setIsReady(false);
        }
      })
      .catch((loadError: Error) => setError(loadError.message));

    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, initializeGoogleSignIn]);

  const handleClick = async () => {
    if (disabled) {
      return;
    }

    setError(null);

    try {
      await initializeGoogleSignIn();
      window.google?.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          setError(`Google prompt was not displayed: ${notification.getNotDisplayedReason()}. Use the Google button below.`);
        } else if (notification.isSkippedMoment()) {
          setError(`Google prompt was skipped: ${notification.getSkippedReason()}. Use the Google button below.`);
        }
      });
    } catch (clickError) {
      setError(clickError instanceof Error ? clickError.message : "Could not start Google sign-in.");
    }
  };

  return (
    <div className="grid gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={handleClick}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-[#1f1f1f] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full border border-[#dadce0] text-sm font-bold text-[#4285f4]">G</span>
        <span>{disabled ? "Signing in..." : "Sign in with Google"}</span>
        <LogIn size={16} className="text-[#5f6368]" />
      </button>
      <div
        ref={buttonRef}
        className={`min-h-10 ${disabled ? "pointer-events-none opacity-55" : ""} ${isReady ? "" : "hidden"}`}
      />
      {error ? <p className="mt-2 text-sm text-coral">{error}</p> : null}
    </div>
  );
}
