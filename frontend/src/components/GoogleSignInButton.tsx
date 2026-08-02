import { useEffect, useRef, useState } from "react";
import { loadGoogleIdentity } from "../lib/googleIdentity";

type GoogleSignInButtonProps = {
  disabled: boolean;
  onCredential: (idToken: string) => void;
};

export function GoogleSignInButton({ disabled, onCredential }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (disabled || !clientId || !buttonRef.current) {
      return;
    }

    let cancelled = false;

    loadGoogleIdentity()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts.id) {
          return;
        }

        buttonRef.current.innerHTML = "";
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
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          shape: "rectangular",
          text: "signin_with",
          width: 280
        });
      })
      .catch((loadError: Error) => setError(loadError.message));

    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, onCredential]);

  if (!clientId) {
    return <p className="text-sm text-coral">Google sign-in is not configured.</p>;
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-55" : ""}>
      <div ref={buttonRef} className="min-h-10" />
      {error ? <p className="mt-2 text-sm text-coral">{error}</p> : null}
    </div>
  );
}
