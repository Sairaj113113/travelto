"use client";

import {
  FormEvent,
  KeyboardEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Compass,
  Mail,
  Plane,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";


function VerifyEmailContent() {

  const router = useRouter();

  const searchParams =
    useSearchParams();


  // ==========================================================
  // EMAIL FROM URL
  // ==========================================================

  const emailFromUrl =
    searchParams.get("email") || "";


  // ==========================================================
  // STATE
  // ==========================================================

  const [email, setEmail] =
    useState(emailFromUrl);

  const [otp, setOtp] =
  useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);

const [loading, setLoading] =
  useState(false);

const [resending, setResending] =
  useState(false);

const [error, setError] =
  useState("");

const [success, setSuccess] =
  useState("");

const [resendCooldown, setResendCooldown] =
  useState(0);


  // ==========================================================
  // OTP REFS
  // ==========================================================

  const otpRefs =
    useRef<(HTMLInputElement | null)[]>(
      []
    );


  // ==========================================================
  // LOAD EMAIL
  // ==========================================================

  useEffect(() => {

    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }

  }, [emailFromUrl]);


  // ==========================================================
  // FOCUS FIRST OTP INPUT
  // ==========================================================

  useEffect(() => {

    const timer = setTimeout(() => {

      otpRefs.current[0]?.focus();

    }, 300);

    return () => clearTimeout(timer);

  }, []);


  // ==========================================================
  // RESEND COUNTDOWN
  // ==========================================================

  useEffect(() => {

    if (resendCooldown <= 0) {
      return;
    }

    const timer =
      setInterval(() => {

        setResendCooldown(
          (previous) =>
            previous > 0
              ? previous - 1
              : 0
        );

      }, 1000);

    return () => clearInterval(timer);

  }, [resendCooldown]);


  // ==========================================================
  // OTP VALUE
  // ==========================================================

  const otpValue =
    otp.join("");


  // ==========================================================
  // OTP CHANGE
  // ==========================================================

  function handleOtpChange(
    index: number,
    value: string
  ) {

    setError("");
    setSuccess("");


    // Keep only numbers

    const cleanValue =
      value
        .replace(/\D/g, "")
        .slice(0, 1);


    if (!cleanValue) {

      const updated = [...otp];

      updated[index] = "";

      setOtp(updated);

      return;
    }


    const updated = [...otp];

    updated[index] = cleanValue;

    setOtp(updated);


    // Move to next box

    if (index < 5) {

      otpRefs.current[
        index + 1
      ]?.focus();

    }

  }


  // ==========================================================
  // OTP KEYBOARD
  // ==========================================================

  function handleOtpKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ) {

    if (
      event.key === "Backspace" &&
      !otp[index] &&
      index > 0
    ) {

      otpRefs.current[
        index - 1
      ]?.focus();

    }


    if (
      event.key === "ArrowLeft" &&
      index > 0
    ) {

      otpRefs.current[
        index - 1
      ]?.focus();

    }


    if (
      event.key === "ArrowRight" &&
      index < 5
    ) {

      otpRefs.current[
        index + 1
      ]?.focus();

    }

  }


  // ==========================================================
  // OTP PASTE
  // ==========================================================

  function handleOtpPaste(
    event: React.ClipboardEvent
  ) {

    event.preventDefault();

    const pasted =
      event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);


    if (!pasted) {
      return;
    }


    const updated = [
      "",
      "",
      "",
      "",
      "",
      "",
    ];


    pasted
      .split("")
      .forEach((digit, index) => {

        if (index < 6) {
          updated[index] = digit;
        }

      });


    setOtp(updated);

    setError("");
    setSuccess("");


    const focusIndex =
      Math.min(
        pasted.length,
        5
      );

    setTimeout(() => {

      otpRefs.current[
        focusIndex
      ]?.focus();

    }, 0);

  }


  // ==========================================================
  // VERIFY OTP
  // ==========================================================

  async function handleVerify(
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    setError("");
    setSuccess("");


    // --------------------------------------------------------
    // Email validation
    // --------------------------------------------------------

    if (!email.trim()) {

      setError(
        "Please enter your email address."
      );

      return;
    }


    // --------------------------------------------------------
    // OTP validation
    // --------------------------------------------------------

    if (otpValue.length !== 6) {

      setError(
        "Please enter the complete 6-digit verification code."
      );

      otpRefs.current[
        otpValue.length
      ]?.focus();

      return;
    }


    setLoading(true);


    try {

      // ------------------------------------------------------
      // API REQUEST
      // ------------------------------------------------------

      const response =
        await fetch(
          `${API_URL}/auth/verify-otp`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email:
                email.trim(),
              otp:
                otpValue,
            }),
          }
        );


      const data =
        await response.json();


      // ------------------------------------------------------
      // ERROR
      // ------------------------------------------------------

      if (!response.ok) {

        throw new Error(
          data?.detail ||
            "Invalid or expired verification code."
        );

      }


      // ======================================================
      // LOGIN SESSION
      // ======================================================

      const token =
        data?.access_token;

      const user =
        data?.user;


      if (!token || !user) {

        throw new Error(
          "Email verified, but the login session could not be created."
        );

      }


      // ------------------------------------------------------
      // SAVE LOGIN SESSION
      // ------------------------------------------------------

      localStorage.setItem(
        "travelto_token",
        token
      );


      localStorage.setItem(
        "travelto_user",
        JSON.stringify(user)
      );


      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      setSuccess(
        "Email verified successfully. Taking you to your dashboard..."
      );


      setOtp([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);


      // ------------------------------------------------------
      // GO TO DASHBOARD
      // ------------------------------------------------------

      setTimeout(() => {

        router.push(
          "/dashboard"
        );

      }, 800);


    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Verification failed. Please try again."
      );

    } finally {

      setLoading(false);

    }

  }


  // ==========================================================
  // RESEND OTP
  // ==========================================================

  async function resendOtp() {

    setError("");
    setSuccess("");


    // --------------------------------------------------------
    // Cooldown
    // --------------------------------------------------------

    if (resendCooldown > 0) {
      return;
    }


    // --------------------------------------------------------
    // Email validation
    // --------------------------------------------------------

    if (!email.trim()) {

      setError(
        "Please enter your email address first."
      );

      return;
    }


    setResending(true);


    try {

      const response =
        await fetch(
          `${API_URL}/auth/resend-otp`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              email:
                email.trim(),
            }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data?.detail ||
            "Unable to resend the verification code."
        );

      }


      // ------------------------------------------------------
      // SUCCESS
      // ------------------------------------------------------

      setOtp([
        "",
        "",
        "",
        "",
        "",
        "",
      ]);


      setSuccess(
        "A new verification code has been sent to your email."
      );


      // ------------------------------------------------------
      // 60 SECOND COOLDOWN
      // ------------------------------------------------------

      setResendCooldown(60);


      setTimeout(() => {

        otpRefs.current[0]?.focus();

      }, 100);


    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to resend the verification code."
      );

    } finally {

      setResending(false);

    }

  }


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <main className="verify-page">

      {/* ====================================================
          BACKGROUND
      ==================================================== */}

      <div className="background-image" />

      <div className="background-overlay" />

      <div className="background-blur" />


      {/* ====================================================
          MAIN GLASS CONTAINER
      ==================================================== */}

      <section className="auth-shell">


        {/* ==================================================
            LEFT BRAND PANEL
        ================================================== */}

        <div className="brand-panel">

          <div className="brand-content">


            {/* LOGO */}

            <Link
              href="/"
              className="brand-logo"
            >

              <span className="brand-logo-icon">

                <Plane
                  size={17}
                  strokeWidth={2.2}
                />

              </span>

              <span>
                Travelto
              </span>

            </Link>


            {/* BADGE */}

            <div className="ai-badge">

              <span className="ai-dot" />

              AI POWERED TRAVEL

            </div>


            {/* TITLE */}

            <h1 className="brand-title">

              Almost
              <br />

              <span>there.</span>

            </h1>


            <p className="brand-description">

              One quick verification and
              your personalized travel
              experience is ready to begin.

            </p>


            {/* FEATURES */}

            <div className="travel-features">


              <div className="travel-feature">

                <div className="feature-icon">

                  <Compass size={17} />

                </div>

                <div>

                  <strong>
                    Discover
                  </strong>

                  <span>
                    Find amazing places
                  </span>

                </div>

              </div>


              <div className="travel-feature">

                <div className="feature-icon">

                  <CalendarDays size={17} />

                </div>

                <div>

                  <strong>
                    Plan
                  </strong>

                  <span>
                    Build smart itineraries
                  </span>

                </div>

              </div>


              <div className="travel-feature">

                <div className="feature-icon">

                  <Plane size={17} />

                </div>

                <div>

                  <strong>
                    Travel
                  </strong>

                  <span>
                    Enjoy every moment
                  </span>

                </div>

              </div>

            </div>


            {/* SLIDER DOTS */}

            <div className="slider-dots">

              <span className="dot active" />

              <span className="dot" />

              <span className="dot" />

            </div>

          </div>

        </div>


        {/* ==================================================
            RIGHT VERIFICATION PANEL
        ================================================== */}

        <div className="form-panel">


          <div className="form-inner">


            {/* MOBILE LOGO */}

            <Link
              href="/"
              className="mobile-logo"
            >

              <Plane size={17} />

              Travelto

            </Link>


            {/* TOP LABEL */}

            <div className="form-eyebrow">

              <span className="eyebrow-icon">

                <ShieldCheck size={16} />

              </span>

              SECURITY VERIFICATION

            </div>


            {/* HEADING */}

            <h2 className="form-title">

              Verify your
              <br />

              <span>email address</span>

            </h2>


            <p className="form-subtitle">

              We've sent a 6-digit verification
              code to the email address below.

            </p>


            {/* EMAIL DISPLAY */}

            <div className="email-display">

              <div className="email-icon">

                <Mail size={17} />

              </div>

              <div className="email-info">

                <span>
                  Verification email sent to
                </span>

                <strong>
                  {email ||
                    "your email address"}
                </strong>

              </div>

            </div>


            {/* FORM */}

            <form
              onSubmit={handleVerify}
              className="verification-form"
            >


              {/* OTP LABEL */}

              <div className="otp-label-row">

                <label>
                  Verification code
                </label>

                <span>
                  6 digits
                </span>

              </div>


              {/* OTP BOXES */}

           <div
  className="otp-container"
  onPaste={handleOtpPaste}
>
  {otp.map((digit, index) => (
    <input
      key={index}
      ref={(element) => {
        otpRefs.current[index] = element;
      }}
      className={`otp-box ${
        digit ? "filled" : ""
      }`}
      type="text"
      inputMode="numeric"
      autoComplete={
        index === 0
          ? "one-time-code"
          : "off"
      }
      maxLength={1}
      value={digit}
      onChange={(event) =>
        handleOtpChange(
          index,
          event.target.value
        )
      }
      onKeyDown={(event) =>
        handleOtpKeyDown(index, event)
      }
      disabled={loading}
      aria-label={`Verification digit ${index + 1}`}
    />
  ))}
</div>


              {/* ERROR */}

              {error && (

                <div className="message error-message">

                  <XCircle
                    size={15}
                    strokeWidth={2}
                  />

                  <span>
                    {error}
                  </span>

                </div>

              )}


              {/* SUCCESS */}

              {success && (

                <div className="message success-message">

                  <CheckCircle2
                    size={15}
                    strokeWidth={2}
                  />

                  <span>
                    {success}
                  </span>

                </div>

              )}


              {/* VERIFY BUTTON */}

              <button
                type="submit"
                className="verify-button"
                disabled={loading}
              >

                {loading ? (

                  <>

                    <span className="spinner" />

                    Verifying...

                  </>

                ) : (

                  <>

                    Verify email

                    <ArrowRight
                      size={17}
                    />

                  </>

                )}

              </button>


            </form>


            {/* RESEND */}

            <div className="resend-area">

              <span>
                Didn't receive the code?
              </span>


              <button
                type="button"
                className="resend-button"
                onClick={resendOtp}
                disabled={
                  resending ||
                  resendCooldown > 0
                }
              >

                <RefreshCw
                  size={14}
                  className={
                    resending
                      ? "refresh-spin"
                      : ""
                  }
                />

                {resending
                  ? "Sending..."
                  : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend code"}

              </button>

            </div>


            {/* SECURITY NOTE */}

            <div className="security-note">

              <ShieldCheck
                size={15}
              />

              <span>
                Your verification code is
                encrypted and expires after
                10 minutes.
              </span>

            </div>


            {/* BACK */}

            <Link
              href="/register"
              className="back-link"
            >

              <ArrowLeft
                size={15}
              />

              Back to registration

            </Link>


          </div>

        </div>


      </section>


      {/* ====================================================
          STYLES
      ==================================================== */}

      <style jsx>{`

        /* ==================================================
           PAGE
        ================================================== */

        .verify-page {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow: hidden;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 32px;

          background: #071522;
        }


        /* ==================================================
           BACKGROUND IMAGE
        ================================================== */

        .background-image {
          position: fixed;
          inset: -25px;

          background-image:
            url("/images/auth-travel.png");

          background-size: cover;
          background-position: center;

          filter: blur(5px);

          transform: scale(1.05);

          z-index: 0;
        }


        .background-overlay {
          position: fixed;
          inset: 0;

          background:
            linear-gradient(
              90deg,
              rgba(3, 20, 31, 0.48),
              rgba(3, 20, 31, 0.18)
            );

          z-index: 1;
        }


        .background-blur {
          position: fixed;
          inset: 0;

          background:
            radial-gradient(
              circle at 50% 45%,
              rgba(
                255,
                255,
                255,
                0.08
              ),
              transparent 55%
            );

          z-index: 2;

          pointer-events: none;
        }


        /* ==================================================
           MAIN GLASS SHELL
        ================================================== */

        .auth-shell {
          position: relative;
          z-index: 5;

          width: min(
            1150px,
            100%
          );

          min-height: 700px;

          display: grid;

          grid-template-columns:
            46% 54%;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.28
            );

          border-radius: 30px;

          overflow: hidden;

          background:
            rgba(
              255,
              255,
              255,
              0.10
            );

          box-shadow:
            0 35px 100px
            rgba(
              0,
              0,
              0,
              0.32
            );

          backdrop-filter:
            blur(18px);

          -webkit-backdrop-filter:
            blur(18px);
        }


        /* ==================================================
           LEFT PANEL
        ================================================== */

        .brand-panel {
          position: relative;

          display: flex;
          align-items: stretch;

          padding: 48px;

          background:
            linear-gradient(
              135deg,
              rgba(
                4,
                32,
                45,
                0.56
              ),
              rgba(
                8,
                48,
                58,
                0.30
              )
            );

          border-right:
            1px solid
            rgba(
              255,
              255,
              255,
              0.16
            );
        }


        .brand-content {
          display: flex;
          flex-direction: column;

          width: 100%;
        }


        /* ==================================================
           LOGO
        ================================================== */

        .brand-logo {
          display: inline-flex;
          align-items: center;

          width: fit-content;

          gap: 9px;

          color: white;

          text-decoration: none;

          font-size: 18px;

          font-weight: 700;

          letter-spacing: -0.3px;

          margin-bottom: auto;
        }


        .brand-logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;

          width: 31px;
          height: 31px;

          color: #35e0cf;

          transform:
            rotate(-7deg);
        }


        /* ==================================================
           AI BADGE
        ================================================== */

        .ai-badge {
          display: flex;
          align-items: center;

          gap: 8px;

          width: fit-content;

          padding:
            8px 13px;

          border-radius: 30px;

          border:
            1px solid
            rgba(
              93,
              234,
              212,
              0.32
            );

          background:
            rgba(
              14,
              118,
              110,
              0.25
            );

          color:
            #e8fffb;

          font-size: 9px;

          font-weight: 800;

          letter-spacing: 1.1px;

          margin-bottom: 22px;
        }


        .ai-dot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background:
            #34d399;

          box-shadow:
            0 0 10px
            rgba(
              52,
              211,
              153,
              0.8
            );
        }


        /* ==================================================
           BRAND TITLE
        ================================================== */

        .brand-title {
          margin: 0;

          color: white;

          font-size:
            clamp(
              48px,
              5vw,
              72px
            );

          line-height: 0.96;

          letter-spacing:
            -3.5px;

          font-weight: 800;
        }


        .brand-title span {
          color:
            #5eead4;
        }


        .brand-description {
          max-width: 430px;

          margin:
            22px 0 0;

          color:
            rgba(
              255,
              255,
              255,
              0.76
            );

          font-size: 14px;

          line-height: 1.7;
        }


        /* ==================================================
           FEATURES
        ================================================== */

        .travel-features {
          display: flex;

          gap: 12px;

          margin-top: auto;

          padding-top: 55px;
        }


        .travel-feature {
          flex: 1;

          display: flex;
          flex-direction: column;

          gap: 10px;

          padding:
            14px;

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.15
            );

          border-radius: 15px;

          background:
            rgba(
              255,
              255,
              255,
              0.08
            );
        }


        .feature-icon {
          width: 35px;
          height: 35px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          color:
            #b8fff4;

          background:
            rgba(
              255,
              255,
              255,
              0.10
            );

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.14
            );
        }


        .travel-feature strong {
          display: block;

          color: white;

          font-size: 11px;

          font-weight: 700;
        }


        .travel-feature span {
          display: block;

          color:
            rgba(
              255,
              255,
              255,
              0.56
            );

          font-size: 9px;

          margin-top: 4px;

          line-height: 1.4;
        }


        /* ==================================================
           DOTS
        ================================================== */

        .slider-dots {
          display: flex;

          align-items: center;

          gap: 7px;

          margin-top: 22px;
        }


        .dot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background:
            rgba(
              255,
              255,
              255,
              0.45
            );
        }


        .dot.active {
          width: 38px;

          border-radius: 10px;

          background: white;
        }


        /* ==================================================
           RIGHT FORM PANEL
        ================================================== */

        .form-panel {
          display: flex;

          align-items: center;
          justify-content: center;

          padding: 38px;

          background:
            rgba(
              248,
              250,
              252,
              0.92
            );

          backdrop-filter:
            blur(25px);

          -webkit-backdrop-filter:
            blur(25px);
        }


        .form-inner {
          width: min(
            430px,
            100%
          );
        }


        /* ==================================================
           MOBILE LOGO
        ================================================== */

        .mobile-logo {
          display: none;

          align-items: center;

          gap: 8px;

          color:
            #0f766e;

          text-decoration: none;

          font-size: 18px;

          font-weight: 800;

          margin-bottom: 30px;
        }


        /* ==================================================
           EYEBROW
        ================================================== */

        .form-eyebrow {
          display: flex;
          align-items: center;

          gap: 8px;

          color:
            #0f766e;

          font-size: 9px;

          font-weight: 800;

          letter-spacing:
            1.5px;

          margin-bottom: 17px;
        }


        .eyebrow-icon {
          display: flex;

          align-items: center;
          justify-content: center;

          width: 28px;
          height: 28px;

          border-radius: 9px;

          color:
            #0f766e;

          background:
            #dffaf3;
        }


        /* ==================================================
           FORM TITLE
        ================================================== */

        .form-title {
          margin: 0;

          color:
            #0f172a;

          font-size:
            clamp(
              34px,
              4vw,
              48px
            );

          line-height:
            1.02;

          letter-spacing:
            -2px;

          font-weight: 800;
        }


        .form-title span {
          color:
            #0f766e;
        }


        .form-subtitle {
          margin:
            14px 0 25px;

          color:
            #64748b;

          font-size: 13px;

          line-height: 1.65;

          max-width: 390px;
        }


        /* ==================================================
           EMAIL DISPLAY
        ================================================== */

        .email-display {
          display: flex;
          align-items: center;

          gap: 12px;

          padding:
            13px 15px;

          border:
            1px solid
            #d7eee8;

          border-radius: 14px;

          background:
            rgba(
              236,
              253,
              245,
              0.78
            );

          margin-bottom: 25px;
        }


        .email-icon {
          width: 38px;
          height: 38px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          color:
            #0f766e;

          background:
            white;

          border-radius: 11px;

          box-shadow:
            0 3px 12px
            rgba(
              15,
              118,
              110,
              0.08
            );
        }


        .email-info {
          min-width: 0;

          display: flex;
          flex-direction: column;

          gap: 3px;
        }


        .email-info span {
          color:
            #64748b;

          font-size: 9px;

          font-weight: 600;
        }


        .email-info strong {
          color:
            #0f172a;

          font-size: 12px;

          font-weight: 700;

          overflow: hidden;

          text-overflow:
            ellipsis;

          white-space: nowrap;
        }


        /* ==================================================
           OTP LABEL
        ================================================== */

        .otp-label-row {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          margin-bottom: 10px;
        }


        .otp-label-row label {
          color:
            #334155;

          font-size: 11px;

          font-weight: 700;
        }


        .otp-label-row span {
          color:
            #94a3b8;

          font-size: 9px;

          font-weight: 600;
        }


        /* ==================================================
           OTP BOXES
        ================================================== */

        .otp-container {
          display: grid;

          grid-template-columns:
            repeat(6, 1fr);

          gap: 9px;

          width: 100%;

          margin-bottom: 16px;
        }


        .otp-box {
          width: 100%;

          height: 58px;

          border:
            1px solid
            #d8e2ea;

          border-radius: 13px;

          background:
            rgba(
              255,
              255,
              255,
              0.82
            );

          outline: none;

          text-align: center;

          color:
            #0f766e;

          font-size: 23px;

          font-weight: 800;

          transition:
            border-color
              0.2s ease,
            box-shadow
              0.2s ease,
            background
              0.2s ease,
            transform
              0.2s ease;
        }


        .otp-box:hover {
          border-color:
            #99dcd1;
        }


        .otp-box:focus {
          border-color:
            #0f766e;

          background:
            #f0fdfa;

          box-shadow:
            0 0 0 4px
            rgba(
              15,
              118,
              110,
              0.09
            );

          transform:
            translateY(-1px);
        }


        .otp-box.filled {
          border-color:
            #5fcfc0;

          background:
            #f0fdfa;
        }


        /* ==================================================
           MESSAGES
        ================================================== */

        .message {
          display: flex;
          align-items: center;

          gap: 8px;

          padding:
            11px 12px;

          border-radius: 11px;

          font-size: 10px;

          line-height: 1.45;

          margin-bottom: 13px;
        }


        .error-message {
          color:
            #be123c;

          border:
            1px solid
            #fecdd3;

          background:
            #fff1f2;
        }


        .success-message {
          color:
            #047857;

          border:
            1px solid
            #a7f3d0;

          background:
            #ecfdf5;
        }


        /* ==================================================
           VERIFY BUTTON
        ================================================== */

        .verify-button {
          width: 100%;

          height: 52px;

          border: 0;

          border-radius: 14px;

          display: flex;

          align-items: center;

          justify-content: center;

          gap: 9px;

          background:
            linear-gradient(
              135deg,
              #0f766e,
              #10b981
            );

          color: white;

          font-size: 12px;

          font-weight: 800;

          cursor: pointer;

          box-shadow:
            0 9px 22px
            rgba(
              15,
              118,
              110,
              0.20
            );

          transition:
            transform
              0.2s ease,
            box-shadow
              0.2s ease,
            opacity
              0.2s ease;
        }


        .verify-button:hover:not(
          :disabled
        ) {
          transform:
            translateY(-1px);

          box-shadow:
            0 13px 28px
            rgba(
              15,
              118,
              110,
              0.27
            );
        }


        .verify-button:disabled {
          opacity: 0.7;

          cursor: wait;

          transform: none;
        }


        /* ==================================================
           SPINNER
        ================================================== */

        .spinner {
          width: 16px;
          height: 16px;

          border:
            2px solid
            rgba(
              255,
              255,
              255,
              0.35
            );

          border-top-color:
            white;

          border-radius: 50%;

          animation:
            spin
            0.7s
            linear
            infinite;
        }


        @keyframes spin {

          to {
            transform:
              rotate(360deg);
          }

        }


        /* ==================================================
           RESEND
        ================================================== */

        .resend-area {
          display: flex;

          align-items: center;
          justify-content: center;

          gap: 5px;

          margin-top: 19px;

          font-size: 10px;

          color:
            #94a3b8;
        }


        .resend-button {
          display: inline-flex;

          align-items: center;

          gap: 5px;

          padding: 0;

          border: 0;

          background: transparent;

          color:
            #0f766e;

          font-size: 10px;

          font-weight: 800;

          cursor: pointer;
        }


        .resend-button:hover:not(
          :disabled
        ) {
          text-decoration:
            underline;
        }


        .resend-button:disabled {
          color:
            #94a3b8;

          cursor: not-allowed;
        }


        .refresh-spin {
          animation:
            spin
            0.8s
            linear
            infinite;
        }


        /* ==================================================
           SECURITY NOTE
        ================================================== */

        .security-note {
          display: flex;

          align-items: flex-start;

          gap: 8px;

          margin-top: 24px;

          padding:
            12px 13px;

          border:
            1px solid
            #e2e8f0;

          border-radius: 11px;

          background:
            rgba(
              248,
              250,
              252,
              0.85
            );

          color:
            #64748b;

          font-size: 9px;

          line-height: 1.55;
        }


        .security-note svg {
          flex-shrink: 0;

          color:
            #0f766e;

          margin-top: 1px;
        }


        /* ==================================================
           BACK LINK
        ================================================== */

        .back-link {
          display: flex;

          align-items: center;
          justify-content: center;

          gap: 6px;

          margin-top: 21px;

          color:
            #64748b;

          font-size: 10px;

          font-weight: 600;

          text-decoration: none;

          transition:
            color
            0.2s ease;
        }


        .back-link:hover {
          color:
            #0f766e;
        }


        /* ==================================================
           RESPONSIVE
        ================================================== */

        @media (
          max-width: 900px
        ) {

          .verify-page {
            padding: 20px;
          }


          .auth-shell {
            grid-template-columns:
              1fr;

            width: min(
              600px,
              100%
            );

            min-height: auto;
          }


          .brand-panel {
            display: none;
          }


          .form-panel {
            min-height:
              680px;

            padding:
              42px 34px;
          }


          .mobile-logo {
            display: flex;
          }

        }


        @media (
          max-width: 520px
        ) {

          .verify-page {
            padding: 12px;
          }


          .auth-shell {
            border-radius: 22px;
          }


          .form-panel {
            padding:
              30px 22px;

            min-height:
              calc(
                100vh - 24px
              );
          }


          .form-title {
            font-size: 34px;
          }


          .form-subtitle {
            font-size: 12px;
          }


          .email-display {
            padding:
              12px;
          }


          .otp-container {
            gap: 6px;
          }


          .otp-box {
            height: 52px;

            border-radius: 11px;

            font-size: 20px;
          }


          .resend-area {
            flex-direction:
              column;

            gap: 5px;
          }

        }


        @media (
          max-width: 370px
        ) {

          .form-panel {
            padding:
              26px 16px;
          }


          .otp-container {
            gap: 4px;
          }


          .otp-box {
            height: 48px;

            font-size: 18px;
          }

        }

      `}</style>

    </main>
  );
}


// ============================================================
// PAGE WRAPPER
// ============================================================

export default function VerifyEmailPage() {

  return (

    <Suspense
      fallback={

        <main
          style={{
            minHeight: "100vh",
            background: "#071522",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontFamily:
              "Arial, sans-serif",
          }}
        >

          Loading...

        </main>

      }
    >

      <VerifyEmailContent />

    </Suspense>

  );
}