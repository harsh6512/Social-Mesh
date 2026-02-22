import { useState, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../../lib/apiError";
import { handleApiError } from "../../../lib/handleApiError";
import { UserSchemas } from "@repo/common/schemas";
import toast from "react-hot-toast";

type Step = "email" | "otp" | "newPassword" | "success";

const steps = ["Identify", "Verify", "Reset"];

const StepIndicator = ({ current }: { current: Step }) => {
  const stepIndex: Record<Step, number> = {
    email: 0,
    otp: 1,
    newPassword: 2,
    success: 2,
  };

  const active = stepIndex[current];

  return (
    <ul className="steps steps-horizontal w-full mb-6 sm:mb-8">
      {steps.map((label, i) => (
        <li
          key={label}
          className={`step text-[10px] sm:text-xs font-semibold tracking-widest uppercase ${
            i <= active ? "step-primary" : ""
          }`}
        >
          {label}
        </li>
      ))}
    </ul>
  );
};

// STEP 1: SEND OTP
const EmailStep = ({ onNext }: { onNext: (email: string) => void }) => {
  const [email, setEmail] = useState("");

  const { mutate, isPending } = useMutation<
    void,
    ApiError,
    UserSchemas.forgotPasswordData
  >({
    mutationFn: async (data) => {
      const res = await fetch("/api/v1/users/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new ApiError(res.status, result.message, result.errors);
      }
    },
    onSuccess: () => {
      toast.success("OTP sent to your email");
      onNext(email);
    },
    onError: (error) => handleApiError(error),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ email });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Forgot password?
        </h2>
        <p className="text-base-content/60 text-xs sm:text-sm mt-1 sm:mt-2">
          Enter your email address and we'll send you an OTP.
        </p>
      </div>

      <label className="form-control w-full mt-2">
        <div className="label">
          <span className="label-text font-medium">Email Address</span>
        </div>
        <input
          type="email"
          placeholder="e.g. example@email.com"
          className="input input-bordered w-full focus:input-primary"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </label>

      <button
        type="submit"
        className="btn btn-primary w-full mt-2 sm:mt-4"
        disabled={isPending || !email.trim()}
      >
        {isPending && <span className="loading loading-spinner"></span>}
        {isPending ? "Sending OTP..." : "Send OTP"}
      </button>
    </form>
  );
};

// RESEND OTP HOOK
const RESEND_COOLDOWN = 60;

const useResendOtp = (email: string) => {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  // Start countdown on mount
  useEffect(() => {
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { mutate, isPending } = useMutation<void, ApiError, { email: string }>({
    mutationFn: async (data) => {
      const res = await fetch("/api/v1/users/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new ApiError(res.status, result.message, result.errors);
      }
    },
    onSuccess: () => {
      toast.success("New OTP sent to your email");
      setCooldown(RESEND_COOLDOWN);
    },
    onError: (error) => handleApiError(error),
  });

  const resend = useCallback(() => {
    if (cooldown === 0 && !isPending) {
      mutate({ email });
    }
  }, [cooldown, isPending, email, mutate]);

  return { resend, cooldown, isPending };
};


// STEP 2: VERIFY OTP
const OTPStep = ({
  email,
  onNext,
  onBack,
}: {
  email: string;
  onNext: () => void;
  onBack: () => void;
}) => {

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const { resend, cooldown, isPending: resendPending } = useResendOtp(email);

  const { mutate, isPending } = useMutation<
    void,
    ApiError,
    { email: string; otp: string }
  >({
    mutationFn: async (data) => {
      const res = await fetch("/api/v1/users/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new ApiError(res.status, result.message, result.errors);
      }
    },
    onSuccess: () => {
      toast.success("OTP verified successfully");
      onNext();
    },
    onError: (error) => handleApiError(error),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join("");
    const validation = UserSchemas.OTPSchema.safeParse({ otp: otpValue });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    mutate({ email, otp: otpValue });
  };

  const handleChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const filled = otp.every((d) => d !== "");

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Check your inbox
        </h2>
        <p className="text-base-content/60 text-xs sm:text-sm mt-1 sm:mt-2">
          We sent a 6-digit OTP to{" "}
          <span className="text-base-content font-semibold break-all">
            {email}
          </span>
          .
        </p>
      </div>

      <div className="flex gap-1.5 sm:gap-2 justify-center mt-2">
        {otp.map((digit, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(e.target.value, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className="input input-bordered w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold focus:input-primary px-1"
            autoFocus={i === 0}
          />
        ))}
      </div>

      <div className="text-center text-xs sm:text-sm text-base-content/60">
        {cooldown > 0 ? (
          <span>
            Resend OTP in{" "}
            <span className="font-semibold text-base-content tabular-nums">
              {cooldown}s
            </span>
          </span>
        ) : (
          <button
            type="button"
            className="link link-primary font-semibold"
            onClick={resend}
            disabled={resendPending}
          >
            {resendPending ? "Sending..." : "Resend OTP"}
          </button>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
        <button
          type="button"
          className="btn btn-ghost sm:flex-1"
          onClick={onBack}
        >
          Back
        </button>

        <button
          type="submit"
          className="btn btn-primary sm:flex-1"
          disabled={!filled || isPending}
        >
          {isPending && <span className="loading loading-spinner"></span>}
          {isPending ? "Verifying..." : "Verify OTP"}
        </button>
      </div>
    </form>
  );
};

// STEP 3: RESET PASSWORD
const NewPasswordStep = ({
  onSuccess,
  onBack,
}: {
  onSuccess: () => void;
  onBack: () => void;
}) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const { mutate, isPending } = useMutation<void, ApiError, { password: string }>(
    {
      mutationFn: async (data) => {
        const res = await fetch("/api/v1/users/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await res.json();

        if (!res.ok) {
          throw new ApiError(res.status, result.message, result.errors);
        }
      },
      onSuccess: () => {
        toast.success("Password reset successful");
        onSuccess();
      },
      onError: (error) => handleApiError(error),
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    const validation = UserSchemas.passwordSchema.safeParse({ password });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    mutate({ password });
  };

  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
          Set New Password
        </h2>
        <p className="text-base-content/60 text-xs sm:text-sm mt-1 sm:mt-2">
          Choose a strong password you haven't used before.
        </p>
      </div>

      <label className="form-control w-full mt-2">
        <div className="label">
          <span className="label-text font-medium">New Password</span>
        </div>
        <input
          type="password"
          placeholder="Min. 8 characters"
          className="input input-bordered w-full focus:input-primary"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
        />
      </label>

      <label className="form-control w-full">
        <div className="label pt-0 sm:pt-2">
          <span className="label-text font-medium">Confirm Password</span>
        </div>
        <input
          type="password"
          placeholder="Re-enter password"
          className={`input input-bordered w-full focus:input-primary ${
            mismatch ? "input-error" : ""
          }`}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </label>

      <div className="flex flex-col-reverse sm:flex-row gap-3 mt-4">
        <button
          type="button"
          className="btn btn-ghost sm:flex-1"
          onClick={onBack}
        >
          Start Over
        </button>

        <button
          type="submit"
          className="btn btn-primary sm:flex-1"
          disabled={isPending || mismatch || !password || !confirm}
        >
          {isPending && <span className="loading loading-spinner"></span>}
          {isPending ? "Resetting..." : "Reset Password"}
        </button>
      </div>
    </form>
  );
};

// MAIN PAGE
const ForgotPasswordPage = () => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  return (
    <div className="w-screen min-h-screen bg-base-100 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="flex flex-col gap-0 w-full">
          {step !== "success" && <StepIndicator current={step} />}

          {step === "email" && (
            <EmailStep
              onNext={(e) => {
                setEmail(e);
                setStep("otp");
              }}
            />
          )}

          {step === "otp" && (
            <OTPStep
              email={email}
              onNext={() => setStep("newPassword")}
              onBack={() => setStep("email")}
            />
          )}

          {step === "newPassword" && (
            <NewPasswordStep
              onSuccess={() => setStep("success")}
              // FIX 2: go back to email so user re-requests a fresh OTP
              // the verify-OTP cookie/token is already consumed — going back
              // to "otp" would just result in a failed re-verify attempt
              onBack={() => setStep("email")}
            />
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-4 text-center py-6 sm:py-8">
              <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  Password reset!
                </h2>
                <p className="text-base-content/60 text-sm mt-2 max-w-xs mx-auto">
                  Your password has been updated successfully.
                </p>
              </div>
              {/* FIX 5: useNavigate instead of <a href> to avoid full reload */}
              <button
                className="btn btn-primary w-full mt-4 sm:mt-6"
                onClick={() => navigate("/login")}
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { ForgotPasswordPage };