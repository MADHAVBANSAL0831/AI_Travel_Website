"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plane, Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface AuthPageProps {
  initialMode?: "login" | "register";
}

export default function AuthPage({ initialMode = "login" }: AuthPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ fullName: "", email: "", password: "" });
  const [successMessage, setSuccessMessage] = useState("");

  const isLogin = mode === "login";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // Force a hard navigation to ensure middleware picks up the session
        window.location.href = redirectTo;
      } else {
        setError("Login failed. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (registerData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: { data: { full_name: registerData.fullName } },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setSuccessMessage("Check your email for a confirmation link!");
        setIsLoading(false);
        return;
      }

      if (data.session) {
        // Force a hard navigation to ensure middleware picks up the session
        window.location.href = redirectTo;
      }
    } catch (err) {
      console.error("Register error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  const switchMode = () => {
    setError("");
    setMode(isLogin ? "register" : "login");
    // Update URL without full navigation
    window.history.replaceState(null, "", isLogin ? "/register" : "/login");
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-white">
      {/* Branding Panel */}
      <motion.div
        className="hidden lg:flex lg:w-1/2 absolute top-0 bottom-0 p-12 flex-col justify-between overflow-hidden"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)" }}
        initial={false}
        animate={{ left: isLogin ? 0 : "50%" }}
        transition={{ type: "spring", stiffness: 200, damping: 28 }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-300 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
              <Plane className="h-8 w-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">TravelHub</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative z-10 space-y-6"
          >
            <h1 className="text-4xl font-bold text-white leading-tight">
              {isLogin ? <>Your journey begins<br />with a single click</> : <>Start your adventure<br />today</>}
            </h1>
            <p className="text-lg max-w-md text-white/80">
              {isLogin
                ? "Discover amazing destinations, book flights and hotels, all powered by AI assistance."
                : "Join thousands of travelers who plan their trips with our AI-powered platform."}
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              {isLogin ? (
                <>
                  <FeatureBadge icon="✈️" text="500+ Airlines" />
                  <FeatureBadge icon="🏨" text="1M+ Hotels" />
                  <FeatureBadge icon="🤖" text="AI Powered" />
                </>
              ) : (
                <div className="space-y-3">
                  <CheckItem text="Personalized travel recommendations" />
                  <CheckItem text="Best price guarantee on flights & hotels" />
                  <CheckItem text="24/7 AI travel assistant" />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 text-white/60 text-sm">© 2024 TravelHub. All rights reserved.</div>
      </motion.div>

      {/* Form Panel */}
      <motion.div
        className="w-full lg:w-1/2 absolute top-0 bottom-0 flex items-center justify-center p-8 bg-gray-50"
        initial={false}
        animate={{ left: isLogin ? "50%" : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 28 }}
      >
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <Plane className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">TravelHub</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isLogin ? "Welcome back" : "Create your account"}
                </h2>
                <p className="text-gray-600 mt-1">
                  {isLogin ? "Sign in to continue your journey" : "Start planning your dream trips"}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                onClick={handleGoogleAuth}
              >
                <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {isLogin ? "Continue with Google" : "Sign up with Google"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-gray-50 px-4 text-gray-500">or</span>
                </div>
              </div>

              <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
                {!isLogin && (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      type="text"
                      placeholder="Full name"
                      value={registerData.fullName}
                      onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                      className="pl-10 h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                      required
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={isLogin ? loginData.email : registerData.email}
                    onChange={(e) => isLogin
                      ? setLoginData({ ...loginData, email: e.target.value })
                      : setRegisterData({ ...registerData, email: e.target.value })
                    }
                    className="pl-10 h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={isLogin ? "Password" : "Password (min 6 characters)"}
                    value={isLogin ? loginData.password : registerData.password}
                    onChange={(e) => isLogin
                      ? setLoginData({ ...loginData, password: e.target.value })
                      : setRegisterData({ ...registerData, password: e.target.value })
                    }
                    className="pl-10 pr-10 h-11 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                    {successMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-white font-medium shadow-lg hover:shadow-xl transition-all"
                  style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                  disabled={isLoading}
                >
                  {isLoading ? (isLogin ? "Signing in..." : "Creating account...") : (isLogin ? "Sign In" : "Create Account")}
                  {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>

              <p className="text-center text-sm text-gray-600">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-purple-600 hover:text-purple-700 font-semibold"
                >
                  {isLogin ? "Create one" : "Sign in"}
                </button>
              </p>

              {!isLogin && (
                <p className="text-center text-xs text-gray-500">
                  By signing up, you agree to our{" "}
                  <span className="underline cursor-pointer hover:text-gray-700">Terms</span> and{" "}
                  <span className="underline cursor-pointer hover:text-gray-700">Privacy Policy</span>
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-2 text-white/80">
      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-lg">{icon}</div>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-white/80">
      <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span>{text}</span>
    </div>
  );
}

