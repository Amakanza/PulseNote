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

  // Check if username exists and generate unique one
  const generateUniqueUsername = async (baseUsername: string): Promise<string> => {
    try {
      const supa = supabaseClient();
      let username = baseUsername;
      let counter = 1;

      while (counter <= 999) {
        const { data, error } = await supa
          .from("profiles")
          .select("username")
          .eq("username", username)
          .limit(1);

        if (error) {
          console.error("Error checking username:", error);
          return baseUsername;
        }

        if (!data || data.length === 0) {
          return username;
        }

        username = baseUsername + counter;
        counter++;
      }

      return baseUsername + Math.floor(Math.random() * 10000);
    } catch (error) {
      console.error("Username generation error:", error);
      return baseUsername;
    }
  };

  const validateForm = (): string | null => {
    if (!form.firstName.trim()) return "First name is required";
    if (!form.lastName.trim()) return "Last name is required";
    if (!form.email.trim()) return "Email address is required";
    if (!form.password) return "Password is required";
    if (form.password.length < 6) return "Password must be at least 6 characters";
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) return "Please enter a valid email address";

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
      
      // Find existing organization if specified
      let organizationId = null;
      if (form.organization.trim()) {
        const { data: existingOrg } = await supa
          .from("organizations")
          .select("id")
          .eq("name", form.organization.trim())
          .single();

        if (existingOrg) {
          organizationId = existingOrg.id;
        }
      }

      // Generate unique username
      const baseUsername = generateUsername(form.firstName, form.lastName);
      const uniqueUsername = await generateUniqueUsername(baseUsername);

      // Prepare signup data with metadata
      const signupData = {
        email: form.email.toLowerCase().trim(),
        password: form.password,
        options: {
          data: {
            first_name: form.firstName.trim(),
            last_name: form.lastName.trim(),
            full_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
            username: uniqueUsername,
            organization: form.organization.trim() || null,
            organization_id: organizationId,
          },
        },
      };

      console.log('Attempting signup with data:', { 
        email: signupData.email, 
        metadata: signupData.options.data 
      });

      // Attempt signup
      const { data, error } = await supa.auth.signUp(signupData);

      console.log('Signup response:', { data, error });

      if (error) {
        console.error('Signup error details:', error);
        
        // Handle specific error types with user-friendly messages
        const errorMessage = error.message?.toLowerCase() || '';
        
        if (errorMessage.includes('user already registered') || 
            errorMessage.includes('already registered') ||
            errorMessage.includes('duplicate') ||
            errorMessage.includes('already exists')) {
          setMsg("This email address is already registered. Please try signing in instead.");
        } else if (errorMessage.includes('invalid email')) {
          setMsg("Please enter a valid email address.");
        } else if (errorMessage.includes('password') && errorMessage.includes('6')) {
          setMsg("Password must be at least 6 characters long.");
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
          setMsg("Too many signup attempts. Please wait a few minutes and try again.");
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          setMsg("Network error. Please check your internet connection and try again.");
        } else if (errorMessage.includes('timeout')) {
          setMsg("Request timed out. Please try again.");
        } else if (errorMessage.includes('database') || errorMessage.includes('saving new user')) {
          setMsg("There was a database error creating your account. Please try again or contact support.");
        } else if (errorMessage.includes('confirm') || errorMessage.includes('verification')) {
          setMsg("Please check your email for a verification link before signing in.");
        } else {
          // Log the full error for debugging
          console.error('Unhandled signup error:', error);
          setMsg(`Signup failed: ${error.message}`);
        }
        return;
      }

      if (!data?.user) {
        setMsg("Account creation may have succeeded, but user data is missing. Please try signing in.");
        return;
      }

      console.log('Signup successful, user created:', data.user.id);

      // Success handling
      if (!data.user.email_confirmed_at) {
        setMsg(`Account created successfully! Please check your email (${form.email}) to confirm your account. Your username is: ${uniqueUsername}`);
        
        // Optionally redirect to signin after a delay
        setTimeout(() => {
          router.push('/signin');
        }, 5000);
      } else {
        setMsg(`Account created successfully! Your username is: ${uniqueUsername}. Redirecting...`);
        setTimeout(() => {
          router.push('/signin');
        }, 2000);
      }

    } catch (err: any) {
      console.error('Unexpected signup error:', err);
      
      if (err?.message?.includes('fetch') || err?.message?.includes('network')) {
        setMsg("Network error. Please check your internet connection and try again.");
      } else {
        const errorMsg = err?.message || "An unexpected error occurred";
        setMsg(`An unexpected error occurred: ${errorMsg}. Please try again or contact support.`);
      }
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
    if (msg) setMsg("");
  };

  const previewUsername = form.firstName && form.lastName 
    ? generateUsername(form.firstName, form.lastName)
    : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50">
      <div className="panel p-8 max-w-md w-full mx-4 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Join PulseNote</h1>
          <p className="text-slate-600 mt-2">Create your account to get started</p>
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
                  <span className="text-emerald-600"> (in {form.organization})</span>
                )}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
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
              placeholder="Create a password (min. 6 characters)"
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
              Join an existing organization or leave blank to create your own workspace
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
          <p className="text-sm text-slate-600">
            Already have an account?{" "}
            <a 
              href="/signin" 
              className="text-emerald-600 hover:text-emerald-700 hover:underline font-medium"
            >
              Sign in here
            </a>
          </p>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            Having trouble? Contact support for assistance
          </p>
        </div>
      </div>
    </div>
  );
}
