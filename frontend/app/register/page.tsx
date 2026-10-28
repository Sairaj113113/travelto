"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

declare global {
  interface Window {
    google: any;
  }
}

/* =========================================================
   ICONS
========================================================= */

function PlaneIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z" />
      <path d="m10 13 5-5" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
      <path d="M8 14h2M14 14h2M8 17h2" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c.8-3.3 3.3-5 7.5-5s6.7 1.7 7.5 5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a18.7 18.7 0 0 1-3.1 3.9" />
        <path d="M6.6 6.6C3.8 8.6 3 12 3 12s3.5 7 9 7a9.8 9.8 0 0 0 3.4-.6" />
      </svg>
    );
  }

  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.68-.06-1.34-.18-1.97H12v3.73h5.23a4.47 4.47 0 0 1-1.94 2.93v2.43h3.14c1.84-1.69 2.92-4.18 2.92-7.12Z"
      />
      <path
        fill="#34A853"
        d="M12 21.7c2.63 0 4.84-.87 6.45-2.31l-3.14-2.43c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.5A9.75 9.75 0 0 0 12 21.7Z"
      />
      <path
        fill="#FBBC05"
        d="M6.54 13.85a5.86 5.86 0 0 1 0-3.7v-2.5H3.3a9.77 9.77 0 0 0 0 8.7l3.24-2.5Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.12c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.24 14.63 2.3 12 2.3a9.75 9.75 0 0 0-8.7 5.35l3.24 2.5C7.31 7.84 9.46 6.12 12 6.12Z"
      />
    </svg>
  );
}

/* =========================================================
   REGISTER
========================================================= */

export default function RegisterPage() {
  const router = useRouter();

  const googleButtonRef =
    useRef<HTMLDivElement | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [googleConfigured, setGoogleConfigured] =
    useState(false);

  const [error, setError] = useState("");

  /* =========================================================
     GOOGLE CALLBACK
  ========================================================= */

  const handleGoogleResponse = async (
    response: any
  ) => {
    if (!response?.credential) {
      setError(
        "Google authentication failed. Please try again."
      );
      return;
    }

    try {
      setError("");
      setGoogleLoading(true);

      const result = await fetch(
        `${API_URL}/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            credential: response.credential,
          }),
        }
      );

      const data = await result.json();

      if (!result.ok) {
        throw new Error(
          data.detail ||
            "Google registration failed."
        );
      }

      localStorage.setItem(
        "travelto_token",
        data.access_token
      );

      localStorage.setItem(
        "travelto_user",
        JSON.stringify(data.user)
      );

      router.push("/dashboard");
    } catch (err: any) {
      setError(
        err.message ||
          "Google registration failed."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  /* =========================================================
     GOOGLE INITIALIZATION
  ========================================================= */

useEffect(() => {
  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    setGoogleConfigured(false);
    return;
  }

  setGoogleConfigured(true);

  let cancelled = false;
  let checkTimer: ReturnType<typeof setInterval> | null = null;

  const initializeGoogle = () => {
    if (cancelled) return;

    if (
      !window.google ||
      !window.google.accounts ||
      !window.google.accounts.id ||
      !googleButtonRef.current
    ) {
      return false;
    }

    // Prevent this page instance from initializing twice
    if (
      googleButtonRef.current.dataset.googleInitialized ===
      "true"
    ) {
      return true;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
        ux_mode: "popup",
      });

      googleButtonRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        {
          theme: "outline",
          size: "large",
          width: 420,
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
        }
      );

      googleButtonRef.current.dataset.googleInitialized =
        "true";

      return true;
    } catch (error) {
      console.error(
        "Google button initialization failed:",
        error
      );

      return false;
    }
  };

  const waitForGoogle = () => {
    if (initializeGoogle()) {
      if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
      }
    }
  };

  const existingScript =
    document.getElementById(
      "google-gsi-script"
    );

  if (!existingScript) {
    const script =
      document.createElement("script");

    script.id = "google-gsi-script";

    script.src =
      "https://accounts.google.com/gsi/client";

    script.async = true;
    script.defer = true;

    script.onload = () => {
      waitForGoogle();
    };

    script.onerror = () => {
      setGoogleConfigured(false);
      setError(
        "Unable to load Google Sign-In."
      );
    };

    document.head.appendChild(script);
  }

  // Important:
  // This handles returning from Login -> Register
  // when the Google script already exists.
  waitForGoogle();

  checkTimer = setInterval(() => {
    if (initializeGoogle()) {
      if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
      }
    }
  }, 100);

  // Stop checking after 10 seconds
  const timeout = setTimeout(() => {
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = null;
    }
  }, 10000);

  return () => {
    cancelled = true;

    if (checkTimer) {
      clearInterval(checkTimer);
    }

    clearTimeout(timeout);
  };
}, []);

  /* =========================================================
     REGISTER
  ========================================================= */

  const handleRegister = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    const cleanName =
      name.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanName) {
      setError(
        "Please enter your full name."
      );
      return;
    }

    if (!cleanEmail) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter a password."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Please use at least 6 characters for your password."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            password,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Registration failed."
        );
      }

      router.push(
        `/verify-email?email=${encodeURIComponent(
          cleanEmail
        )}`
      );
    } catch (err: any) {
      setError(
        err.message ||
          "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     GOOGLE FALLBACK
  ========================================================= */

  const handleGoogleFallback = () => {
    setError(
      "Google sign-in is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to frontend/.env.local and restart Next.js."
    );
  };

  return (
    <main className="auth-page">

      {/* BACKGROUND */}

      <div className="background-image" />

      <div className="background-overlay" />

      {/* CENTER CARD */}

      <section className="auth-card">

        {/* ===================================================
            LEFT
        =================================================== */}

        <div className="travel-panel">

          <div className="travel-content">

            <Link
              href="/"
              className="brand"
            >
              <span className="brand-icon">
                <PlaneIcon />
              </span>

              <span className="brand-name">
                Travelto
              </span>
            </Link>

            <div className="ai-badge">
              <span className="ai-dot" />
              AI POWERED TRAVEL
            </div>

            <div className="travel-copy">

              <h1>
                Start
                <br />
                Your
                <br />
                Journey
              </h1>

              <p>
                Create your Travelto account
                and let AI turn your travel
                ideas into unforgettable
                journeys.
              </p>

            </div>

            <div className="travel-features">

              <div className="feature-item">

                <div className="feature-circle">
                  <CompassIcon />
                </div>

                <span>
                  Discover
                </span>

              </div>

              <div className="feature-item">

                <div className="feature-circle">
                  <CalendarIcon />
                </div>

                <span>
                  Plan
                </span>

              </div>

              <div className="feature-item">

                <div className="feature-circle">
                  <PlaneIcon />
                </div>

                <span>
                  Travel
                </span>

              </div>

            </div>

            <div className="slider-dots">
              <span className="active" />
              <span />
              <span />
            </div>

          </div>

        </div>

        {/* ===================================================
            RIGHT REGISTER
        =================================================== */}

        <div className="form-panel">

          <div className="form-inner">

            <div className="form-heading">

              <span className="eyebrow">
                CREATE YOUR ACCOUNT
              </span>

              <h2>
                Begin your
                <br />
                adventure
              </h2>

              <p>
                Join Travelto and start
                planning smarter trips with AI.
              </p>

            </div>

            {/* ERROR */}

            {error && (
              <div className="message error">
                <b>!</b>
                <span>{error}</span>
              </div>
            )}

            {/* FORM */}

            <form
              onSubmit={handleRegister}
              className="register-form"
            >

              {/* NAME */}

              <div className="field">

                <label htmlFor="name">
                  Full name
                </label>

                <div className="input-box">

                  <span className="input-icon">
                    <UserIcon />
                  </span>

                  <input
                    id="name"
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) =>
                      setName(
                        e.target.value
                      )
                    }
                    autoComplete="name"
                  />

                </div>

              </div>

              {/* EMAIL */}

              <div className="field">

                <label htmlFor="email">
                  Email address
                </label>

                <div className="input-box">

                  <span className="input-icon">
                    <MailIcon />
                  </span>

                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(
                        e.target.value
                      )
                    }
                    autoComplete="email"
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div className="field">

                <label htmlFor="password">
                  Password
                </label>

                <div className="input-box">

                  <span className="input-icon">
                    <LockIcon />
                  </span>

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="eye-button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                  >
                    <EyeIcon
                      hidden={
                        !showPassword
                      }
                    />
                  </button>

                </div>

              </div>

              {/* CONFIRM */}

              <div className="field">

                <label htmlFor="confirm">
                  Confirm password
                </label>

                <div className="input-box">

                  <span className="input-icon">
                    <LockIcon />
                  </span>

                  <input
                    id="confirm"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Re-enter your password"
                    value={
                      confirmPassword
                    }
                    onChange={(e) =>
                      setConfirmPassword(
                        e.target.value
                      )
                    }
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    className="eye-button"
                    onClick={() =>
                      setShowConfirmPassword(
                        !showConfirmPassword
                      )
                    }
                  >
                    <EyeIcon
                      hidden={
                        !showConfirmPassword
                      }
                    />
                  </button>

                </div>

              </div>

              {/* CREATE */}

              <button
                type="submit"
                className="submit-button"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="spinner" />
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <span>→</span>
                  </>
                )}

              </button>

            </form>

            {/* DIVIDER */}

            <div className="divider">

              <span />
              <b>OR</b>
              <span />

            </div>

            {/* GOOGLE */}

            <div className="google-area">

              {googleConfigured ? (
                <div
                  ref={googleButtonRef}
                  className="google-real"
                />
              ) : (
                <button
                  type="button"
                  className="google-button"
                  onClick={
                    handleGoogleFallback
                  }
                >
                  <GoogleIcon />

                  <span>
                    Continue with Google
                  </span>
                </button>
              )}

              {googleLoading && (
                <small>
                  Creating your account...
                </small>
              )}

            </div>

            {/* LOGIN */}

            <p className="switch-text">

              Already have an account?

              <Link href="/login">
                Sign in
              </Link>

            </p>

          </div>

        </div>

      </section>

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .auth-page {
          min-height: 100vh;
          min-height: 100dvh;

          position: relative;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 28px;

          overflow: hidden;
        }

        /* BACKGROUND */

        .background-image {
          position: fixed;
          inset: -20px;

          z-index: -3;

          background-image:
            url("/images/auth-travel.png");

          background-size: cover;
          background-position: center;

          filter: blur(3px);

          transform: scale(1.035);
        }

        .background-overlay {
          position: fixed;
          inset: 0;

          z-index: -2;

          background:
            linear-gradient(
              135deg,
              rgba(4,35,45,.38),
              rgba(3,15,25,.15) 50%,
              rgba(3,20,24,.42)
            );
        }

        /* CARD */

        .auth-card {
          width: min(1120px, 94vw);

          height: min(760px, 91vh);

          min-height: 620px;

          display: grid;

          grid-template-columns:
            minmax(0,1.03fr)
            minmax(390px,.97fr);

          overflow: hidden;

          position: relative;

          border:
            1px solid
            rgba(255,255,255,.35);

          border-radius: 28px;

          background:
            rgba(255,255,255,.13);

          backdrop-filter:
            blur(22px);

          -webkit-backdrop-filter:
            blur(22px);

          box-shadow:
            0 35px 90px
            rgba(0,0,0,.35),

            0 2px 12px
            rgba(255,255,255,.15);
        }

        .auth-card::before {
          content: "";

          position: absolute;

          inset: 0;

          pointer-events: none;

          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,.16),
              transparent 35%,
              transparent 70%,
              rgba(255,255,255,.08)
            );
        }

        /* LEFT */

        .travel-panel {
          position: relative;

          overflow: hidden;
        }

        .travel-panel::after {
          content: "";

          position: absolute;

          inset: 0;

          background:
            linear-gradient(
              180deg,
              rgba(0,0,0,.05),
              rgba(0,0,0,.06) 40%,
              rgba(0,0,0,.38)
            );

          pointer-events: none;
        }

        .travel-content {
          position: relative;

          z-index: 2;

          height: 100%;

          padding:
            38px 44px 34px;

          display: flex;

          flex-direction: column;
        }

        .brand {
          width: fit-content;

          display: inline-flex;

          align-items: center;

          gap: 10px;

          padding:
            9px 14px 9px 10px;

          border-radius: 14px;

          color: #ffffff !important;

          text-decoration: none !important;

          font-size: 22px;

          font-weight: 800;

          letter-spacing: -.7px;

          background:
            rgba(4,25,32,.48);

          border:
            1px solid
            rgba(255,255,255,.22);

          backdrop-filter:
            blur(14px);

          -webkit-backdrop-filter:
            blur(14px);

          box-shadow:
            0 8px 25px
            rgba(0,0,0,.2);

          text-shadow:
            0 2px 8px
            rgba(0,0,0,.35);
        }

        .brand:hover {
          color: #ffffff !important;

          background:
            rgba(4,25,32,.62);
        }

        .brand-name {
          color: #ffffff !important;

          -webkit-text-fill-color:
            #ffffff !important;
        }

        .brand-icon {
          width: 34px;

          height: 34px;

          display: flex;

          align-items: center;

          justify-content: center;

          color: #2dd4bf !important;

          filter:
            drop-shadow(
              0 2px 7px
              rgba(45,212,191,.55)
            );
        }

        .ai-badge {
          width: fit-content;

          display: flex;

          align-items: center;

          gap: 8px;

          margin-top: 55px;

          padding:
            9px 14px;

          border-radius: 999px;

          color: white;

          background:
            rgba(15,118,110,.35);

          border:
            1px solid
            rgba(255,255,255,.25);

          backdrop-filter:
            blur(14px);

          font-size: 10px;

          font-weight: 800;

          letter-spacing: 1px;
        }

        .ai-dot {
          width: 8px;

          height: 8px;

          border-radius: 50%;

          background: #34d399;

          box-shadow:
            0 0 10px
            rgba(52,211,153,.8);
        }

        .travel-copy {
          margin-top: 17px;
        }

        .travel-copy h1 {
          margin: 0;

          color: white;

          font-size:
            clamp(46px,5vw,70px);

          line-height: .9;

          letter-spacing: -4px;

          font-weight: 900;
        }

        .travel-copy p {
          max-width: 450px;

          margin:
            21px 0 0;

          color:
            rgba(255,255,255,.84);

          font-size: 15px;

          line-height: 1.6;
        }

        .travel-features {
          display: flex;

          gap: 28px;

          margin-top: auto;

          margin-bottom: 24px;
        }

        .feature-item {
          display: flex;

          flex-direction: column;

          align-items: center;

          gap: 8px;

          color: white;

          font-size: 11px;

          font-weight: 600;
        }

        .feature-circle {
          width: 47px;

          height: 47px;

          display: flex;

          align-items: center;

          justify-content: center;

          border-radius: 50%;

          color: white;

          background:
            rgba(255,255,255,.13);

          border:
            1px solid
            rgba(255,255,255,.25);

          backdrop-filter:
            blur(10px);
        }

        .slider-dots {
          display: flex;

          align-items: center;

          gap: 9px;
        }

        .slider-dots span {
          width: 7px;

          height: 7px;

          border-radius: 50%;

          background:
            rgba(255,255,255,.55);
        }

        .slider-dots span.active {
          width: 37px;

          border-radius: 20px;

          background: white;
        }

        /* RIGHT */

        .form-panel {
          margin: 12px;

          border-radius: 22px;

          background:
            rgba(255,255,255,.92);

          backdrop-filter:
            blur(18px);

          -webkit-backdrop-filter:
            blur(18px);

          display: flex;

          align-items: center;

          justify-content: center;

          box-shadow:
            0 12px 40px
            rgba(0,0,0,.08);
        }

        .form-inner {
          width: 100%;

          max-width: 425px;

          padding:
            34px 42px;
        }

        .form-heading .eyebrow {
          color: #0f766e;

          font-size: 10px;

          font-weight: 900;

          letter-spacing: 2px;
        }

        .form-heading h2 {
          margin:
            10px 0 10px;

          color: #0f172a;

          font-size: 39px;

          line-height: .98;

          letter-spacing: -2.5px;

          font-weight: 850;
        }

        .form-heading p {
          margin:
            0 0 20px;

          color: #64748b;

          font-size: 12px;

          line-height: 1.55;
        }

        /* MESSAGE */

        .message {
          display: flex;

          gap: 8px;

          padding:
            9px 12px;

          margin-bottom: 12px;

          border-radius: 10px;

          font-size: 11px;

          line-height: 1.45;
        }

        .message.error {
          color: #be123c;

          background: #fff1f2;

          border:
            1px solid #fecdd3;
        }

        /* FORM */

        .register-form {
          display: flex;

          flex-direction: column;

          gap: 11px;
        }

        .field {
          width: 100%;
        }

        .field label {
          display: block;

          margin-bottom: 6px;

          color: #1e293b;

          font-size: 11px;

          font-weight: 800;
        }

        .input-box {
          height: 47px;

          display: flex;

          align-items: center;

          border:
            1px solid #dce5ec;

          border-radius: 13px;

          background:
            rgba(248,250,252,.82);

          transition: .18s ease;
        }

        .input-box:focus-within {
          border-color: #0f766e;

          background: white;

          box-shadow:
            0 0 0 4px
            rgba(15,118,110,.07);
        }

        .input-icon {
          width: 45px;

          height: 100%;

          flex-shrink: 0;

          display: flex;

          align-items: center;

          justify-content: center;

          color: #64748b;
        }

        .input-box input {
          width: 100%;

          min-width: 0;

          height: 100%;

          border: 0;

          outline: 0;

          background: transparent;

          color: #0f172a;

          font-size: 12px;

          font-family: inherit;

          padding:
            0 8px 0 0;
        }

        .input-box input::placeholder {
          color: #94a3b8;
        }

        .eye-button {
          width: 43px;

          height: 100%;

          flex-shrink: 0;

          display: flex;

          align-items: center;

          justify-content: center;

          border: 0;

          background: transparent;

          color: #64748b;

          cursor: pointer;
        }

        .eye-button:hover {
          color: #0f766e;
        }

        /* BUTTON */

        .submit-button {
          width: 100%;

          height: 50px;

          margin-top: 3px;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 9px;

          border: 0;

          border-radius: 13px;

          background: #0f766e;

          color: white;

          font-size: 13px;

          font-weight: 800;

          cursor: pointer;

          transition: .18s ease;
        }

        .submit-button:hover:not(:disabled) {
          background: #0b625c;

          transform:
            translateY(-1px);

          box-shadow:
            0 10px 25px
            rgba(15,118,110,.2);
        }

        .submit-button:disabled {
          opacity: .7;

          cursor: not-allowed;
        }

        .spinner {
          width: 16px;

          height: 16px;

          border:
            2px solid
            rgba(255,255,255,.4);

          border-top-color: white;

          border-radius: 50%;

          animation:
            spin .7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* DIVIDER */

        .divider {
          display: flex;

          align-items: center;

          gap: 12px;

          margin:
            17px 0 13px;
        }

        .divider span {
          flex: 1;

          height: 1px;

          background: #e2e8f0;
        }

        .divider b {
          color: #94a3b8;

          font-size: 9px;
        }

        /* GOOGLE */

        .google-area {
          width: 100%;
        }

        .google-real {
          width: 100%;

          min-height: 44px;

          display: flex;

          justify-content: center;

          overflow: hidden;
        }

        .google-button {
          width: 100%;

          height: 48px;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 10px;

          border:
            1px solid #dce5ec;

          border-radius: 13px;

          background: white;

          color: #1e293b;

          font-size: 12px;

          font-weight: 700;

          cursor: pointer;

          transition: .18s ease;
        }

        .google-button:hover {
          background: #f8fafc;

          border-color: #c5d1dc;
        }

        .google-area small {
          display: block;

          margin-top: 6px;

          text-align: center;

          color: #64748b;

          font-size: 10px;
        }

        /* SWITCH */

        .switch-text {
          margin:
            16px 0 0;

          text-align: center;

          color: #64748b;

          font-size: 11px;
        }

        .switch-text a {
          margin-left: 5px;

          color: #0f766e;

          font-weight: 800;

          text-decoration: none;
        }

        .switch-text a:hover {
          text-decoration: underline;
        }

        /* RESPONSIVE */

        @media (max-width: 950px) {

          .auth-page {
            padding: 16px;
          }

          .auth-card {
            width: 96vw;

            height: auto;

            min-height: 0;

            grid-template-columns: 1fr;
          }

          .travel-panel {
            min-height: 400px;
          }

          .travel-content {
            min-height: 400px;
          }

          .form-panel {
            margin: 0;

            border-radius:
              0 0 22px 22px;
          }
        }

        @media (max-width: 600px) {

          .auth-page {
            padding: 0;
          }

          .auth-card {
            width: 100vw;

            border-radius: 0;

            border: 0;
          }

          .travel-panel {
            min-height: 350px;
          }

          .travel-content {
            min-height: 350px;

            padding:
              27px 25px;
          }

          .ai-badge {
            margin-top: 40px;
          }

          .travel-copy h1 {
            font-size: 49px;
          }

          .form-panel {
            border-radius: 0;
          }

          .form-inner {
            padding:
              32px 25px;
          }
        }

      `}</style>

    </main>
  );
}