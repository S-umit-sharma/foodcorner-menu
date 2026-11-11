import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabase";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_admin");

      if (adminError) throw adminError;

      if (isAdmin !== true) {
        await supabase.auth.signOut();
        throw new Error("You are not authorized to access the admin dashboard.");
      }

      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-[#fff7f5] px-3 py-8 sm:px-6 sm:py-10">
      {/* Soft background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-red-200/45 blur-3xl sm:h-96 sm:w-96"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-orange-100/80 blur-3xl sm:h-[28rem] sm:w-[28rem]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[12%] top-[14%] hidden h-20 w-20 rounded-full border-[14px] border-red-100/70 sm:block"
      />

      <section className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-[26px] border border-red-100/80 bg-white shadow-[0_24px_80px_rgba(90,25,25,0.14)] sm:rounded-[32px]">
        {/* Brand header */}
        <header
          className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-8 sm:py-6"
          style={{
            paddingInline: "clamp(20px, 5vw, 32px)",
            paddingBlock: "20px",
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E60000] text-white shadow-lg shadow-red-200 sm:h-12 sm:w-12">
              <svg
                width="25"
                height="25"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 10h16" />
                <path d="M5 10a7 7 0 0 1 14 0" />
                <path d="M5 13h14l-1.2 5H6.2L5 13Z" />
                <path d="M7 7h.01M12 5h.01M17 7h.01" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
                Food<span className="text-[#E60000]">Corner</span>
              </p>
              <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-[10px]">
                Fresh · Tasty · Affordable
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-red-50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#D60000] sm:text-[10px]">
            Admin portal
          </span>
        </header>

        {/* Form */}
        <form
          onSubmit={handleLogin}
          className="px-5 pb-7 pt-7 sm:px-8 sm:pb-9 sm:pt-8"
          style={{
            paddingInline: "clamp(20px, 5vw, 32px)",
            paddingTop: "28px",
            paddingBottom: "32px",
            boxSizing: "border-box",
          }}
        >
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in to manage your restaurant menu.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
            >
              {error}
            </div>
          )}

          <div className="space-y-5" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label
                htmlFor="admin-email"
                className="mb-2 block text-sm font-semibold text-slate-700"
                style={{ display: "block", marginBottom: "8px" }}
              >
                Email address
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="Enter your email address"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#E60000] focus:bg-white focus:ring-4 focus:ring-red-100"
                style={{ width: "100%", boxSizing: "border-box", paddingInline: "16px" }}
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-2 block text-sm font-semibold text-slate-700"
                style={{ display: "block", marginBottom: "8px" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#E60000] focus:bg-white focus:ring-4 focus:ring-red-100"
                  style={{ width: "100%", boxSizing: "border-box", paddingLeft: "16px", paddingRight: "48px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg
                      width="19"
                      height="19"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 text-right">
            <a
              href="#"
              className="text-xs font-semibold text-[#D60000] transition hover:text-red-800 hover:underline"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-xl bg-[#E60000] px-4 text-sm font-bold text-white shadow-lg shadow-red-200/70 transition hover:-translate-y-0.5 hover:bg-[#C90000] hover:shadow-xl hover:shadow-red-200/80 focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="shrink-0 text-[11px] font-medium text-slate-400">
              Or continue via
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-100"
              aria-label="Continue with Google"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
              </svg>
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-100"
              aria-label="Continue with Facebook"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.69.24 2.69.24v2.95h-1.52c-1.49 0-1.95.93-1.95 1.88V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z" />
                <path fill="#FFFFFF" d="M16.84 15.47 17.37 12h-3.32V9.36c0-.95.46-1.88 1.95-1.88h1.52V4.53s-1.38-.24-2.69-.24c-2.74 0-4.53 1.66-4.53 4.66V12H7.08v3.47h3.04v8.38a12.06 12.06 0 0 0 3.76 0v-8.38h2.96z" />
              </svg>
            </button>
          </div>

          <p className="mt-7 text-center text-xs text-slate-500 sm:mt-8">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="font-bold text-[#D60000] transition hover:text-red-800 hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}

export default Login;
