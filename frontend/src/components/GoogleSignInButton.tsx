import { LogIn } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadGoogleIdentity } from "../lib/googleIdentity";
import { type Language, translate } from "../lib/i18n";

type GoogleSignInButtonProps = {
  disabled: boolean;
  language: Language;
  onCredential: (idToken: string) => void;
  compact?: boolean;
  hideRenderedButton?: boolean;
  renderedOnly?: boolean;
  variant?: "google" | "google-blue";
};

export function GoogleSignInButton({
  disabled,
  language,
  onCredential,
  compact = false,
  hideRenderedButton = false,
  renderedOnly = false,
  variant = "google"
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const initializedClientIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const t = (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) => translate(language, key, values);

  const initializeGoogleSignIn = useCallback(async () => {
    if (!clientId) {
      throw new Error(t("googleSignInNotConfigured"));
    }

    try {
      await loadGoogleIdentity();
    } catch {
      throw new Error(t("googleSignInUnavailable"));
    }

    if (!window.google?.accounts.id) {
      throw new Error(t("googleSignInUnavailable"));
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

    if (!hideRenderedButton && buttonRef.current) {
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: variant === "google-blue" ? "filled_blue" : "outline",
        size: "large",
        type: compact ? "icon" : "standard",
        shape: "rectangular",
        text: "signin_with",
        width: compact ? 48 : 280
      });
    }

    setIsReady(true);
  }, [clientId, onCredential, language]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    if (!clientId) {
      setError(t("googleSignInNotConfigured"));
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
          setError(
            hideRenderedButton
              ? t("googleSignInStartFailed")
              : `${t("googlePromptNotDisplayed", { reason: notification.getNotDisplayedReason() })} ${t("googlePromptUseButton")}`
          );
        } else if (notification.isSkippedMoment()) {
          setError(
            hideRenderedButton
              ? t("googleSignInStartFailed")
              : `${t("googlePromptSkipped", { reason: notification.getSkippedReason() })} ${t("googlePromptUseButton")}`
          );
        }
      });
    } catch (clickError) {
      setError(clickError instanceof Error ? clickError.message : t("googleSignInStartFailed"));
    }
  };

  return (
    <div className="grid gap-3">
      {renderedOnly ? null : (
        <button
          type="button"
          disabled={disabled}
          onClick={handleClick}
          className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
            variant === "google-blue"
              ? "border border-[#1a73e8] bg-[#1a73e8] text-white hover:bg-[#1765cc] hover:shadow"
              : "border border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f8fafd] hover:shadow"
          }`}
        >
          <span
            className={`grid h-5 w-5 place-items-center rounded-full text-sm font-bold ${
              variant === "google-blue" ? "bg-white text-[#4285f4]" : "border border-[#dadce0] text-[#4285f4]"
            }`}
          >
            G
          </span>
          <span className="min-w-0 truncate">{disabled ? t("signingIn") : compact ? t("google") : t("signInWithGoogle")}</span>
          {compact ? null : <LogIn size={16} className="text-[#5f6368]" />}
        </button>
      )}
      <div
        ref={buttonRef}
        className={`min-h-10 justify-self-center ${disabled ? "pointer-events-none opacity-55" : ""} ${
          hideRenderedButton || (!renderedOnly && !isReady) ? "hidden" : ""
        }`}
      />
      {error ? <p className="mt-2 text-sm text-coral">{error}</p> : null}
    </div>
  );
}
