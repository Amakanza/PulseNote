"use client";
import { useState } from "react";
import { supabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface SignUpForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  organization: string;
}

export default function SignUp() {
  const [form, setForm] = useState<SignUpForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    organization: "",
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Generate username from initials
  const generateUsername = (firstName: string, lastName: string): string => {
    const firstInitial = firstName.trim().charAt(0).toUpperCase();
    const lastInitial = lastName.trim().charAt(0).toUpperCase();
    return firstInitial + lastInitial;
  };

  // Check if username exists in organization and generate unique one
  const generateUniqueUsername = async (baseUsername: string, organization: string): Promise<string> => {
    const supa = supabaseClient();
    let username = baseUsername;
    let counter = 1;

    while (true) {
      // Check if username exists in this organization
      const { data, error } = await supa
        .from("profiles")
        .select("username")
        .eq("username", username)
        .eq("organization", organization || null)
        .single();

      if (error && error.code === 'PGRST116') {
        // No matching record found, username is available
        return username;
      }

      if (error) {
        console.error("Error checking username:", error);
        // If there's an error, just use the base username
        return baseUsername;
      }

      // Username exists, try with number
      username = baseUsername + counter;
      counter++;

      // Safety limit to prevent infinite loop
      if (counter > 999) {
        return baseUsername + Math.floor(Math.random() * 10000);
      }
    }
  };

  const validateForm = (): string | null => {
    if (!form.firstName.trim()) return "First name is required";
    if (!form.lastName.trim()) return "Last name is required";
    if (!form.email.trim()) return "Email address is required";
    if (!form.password) return "Password is required";
    if (form.password.length < 8) return "Password must be at least 8 characters";
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return "Please enter a valid email address";

    // Name validation (letters, spaces, hyphens only)
    const nameRegex = /^[A-Za-z\s\-']+$/;
    if (!nameRegex.test(form.firstName)) return "First name can only contain letters, spaces, and hyphens";
    if (!nameRegex.test(form.lastName)) return "Last name can only contain letters, spaces, and hyphens";

    return null;
  };

  async function handleSignUp() {
    const validationError = validateForm();
    if (validationError) {
      setMsg(validationError);
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const supa = supabaseClient();
      
      // Generate unique username
      const baseUsername = generateUsername(form.firstName, form.lastName);
      const uniqueUsername = await generateUniqueUsername(baseUsername, form.organization);

      // Sign up with Supabase Auth
      const { data, error } = await supa.auth.signUp({
        email: form.email.toLowerCase().trim(),
        password: form.password,
        options: {
          data: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            full_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
            username: uniqueUsername,
            organization: form.organization.trim() || null,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          setMsg("This email address is already registered. Try signing in instead.");
        } else {
          setMsg(error.message);
        }
        return;
      }

      if (data.user && !data.user.email_confirmed_at) {
        setMsg(`Account created successfully! Please check your email (${form.email}) to confirm your account before signing in.`);
      } else {
        setMsg("Account created successfully! Redirecting...");
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }

    } catch (err: any) {
      setMsg("An unexpected error occurred. Please try again.");
      console.error("Sign up error:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleSignUp();
    }
  };

  const updateForm = (field: keyof SignUpForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error message when user starts typing
    if (msg) setMsg("");
  };

  const previewUsername = form.firstName && form.lastName 
    ? generateUsername(form.firstName, form.lastName)
    : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50">
      <div className="panel p-8 max-w-md w-full mx-4 space-y-">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Join PulseNote</h1>
          <p className="text-slate-00 mt-2">Create your account to get started</p>
        </div>

        <div className="space-y-4">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="label block mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              className="input w-full"
              placeholder="Enter your first name"
              value={form.firstName}
              onChange={(e) => updateForm("firstName", e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              autoComplete="given-name"
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="label block mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              className="input w-full"
              placeholder="Enter your last name"
              value={form.lastName}
              onChange={(e) => updateForm("lastName", e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              autoComplete="family-name"
            />
          </div>

          {/* Username Preview */}
          {previewUsername && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3">
              <p className="text-sm text-emerald-700">
                <strong>Your username will be:</strong> {previewUsername}
                {form.organization && (
                  <span className="text-emerald-00"> (in {form.organization})</span>
                )}
              </p>
              <p className="text-xs text-emerald-00 mt-1">
                If this username is taken, a number will be added automatically
              </p>
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="label block mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              className="input w-full"
              placeholder="Enter your email address"
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="label block mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              className="input w-full"
              placeholder="Create a password (min. 8 characters)"
              value={form.password}
              onChange={(e) => updateForm("password", e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {/* Organization (Optional) */}
          <div>
            <label htmlFor="organization" className="label block mb-2">
              Organization <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="organization"
              type="text"
              className="input w-full"
              placeholder="Enter your organization name"
              value={form.organization}
              onChange={(e) => updateForm("organization", e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              autoComplete="organization"
            />
            <p className="text-xs text-slate-500 mt-1">
              This helps organize users and prevent username conflicts
            </p>
          </div>

          {/* Sign Up Button */}
          <button 
            className="btn btn-primary w-full py-3" 
            onClick={handleSignUp}
            disabled={loading || !form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.password}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          {/* Message Display */}
          {msg && (
            <div className={`p-3 rounded-md text-sm ${
              msg.includes("successfully") || msg.includes("check your email")
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {msg}
            </div>
          )}
        </div>

        {/* Sign In Link */}
        <div className="text-center">
          <p className="text-sm text-slate-00">
            Already have an account?{" "}
            <a 
              href="/signin" 
              className="text-emerald-00 hover:text-emerald-700 hover:underline font-medium"
            >
              Sign in here
            </a>
          </p>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
