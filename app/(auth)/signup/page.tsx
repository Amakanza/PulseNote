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
    try {
      const supa = supabaseClient();
      let username = baseUsername;
      let counter = 1;

      while (counter <= 999) {
        // Check if username exists in this organization in user_organizations table
        const { data, error } = await supa
          .from("user_organizations")
          .select(`
            user_id,
            auth_users:user_id (
              raw_user_meta_data
            )
          `)
          .eq("organization_id", organization || null)
          .limit(100); // Get all users in this org

        if (error) {
          console.error("Error checking usernames:", error);
          // If there's an error, just use the base username
          return baseUsername;
        }

        // Check if this username is taken by examining user metadata
        const usernameTaken = data?.some(membership => {
          const userData = membership.auth_users as any;
          return userData?.raw_user_meta_data?.username === username;
        });

        if (!usernameTaken) {
          return username;
        }

        // Username exists, try with number
        username = baseUsername + counter;
        counter++;
      }

      // Safety fallback
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
      
      // Find or create organization if specified
      let organizationId = null;
      if (form.organization.trim()) {
        // Check if organization exists
        const { data: existingOrg, error: orgError } = await supa
          .from("organizations")
          .select("id")
          .eq("name", form.organization.trim())
          .single();

        if (existingOrg) {
          organizationId = existingOrg.id;
        } else if (orgError?.code === 'PGRST116') {
          // Organization doesn't exist, we'll let the trigger create a personal one
          organizationId = null;
        } else if (orgError) {
          console.error("Organization check error:", orgError);
        }
      }

      // Generate unique username
      const baseUsername = generateUsername(form.firstName, form.lastName);
      const uniqueUsername = await generateUniqueUsername(baseUsername, organizationId);

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
            organization_id: organizationId,
          },
        },
      });

      if (error) {
        console.error("Signup error:", error);
        
        if (error.message.includes("already registered")) {
          setMsg("This email address is already registered. Try signing in instead.");
        } else if (error.message.includes("rate limit")) {
          setMsg("Too many signup attempts. Please wait a few minutes and try again.");
        } else if (error.message.includes("timeout") || error.message.includes("504")) {
          setMsg("Server is currently busy. Please try again in a moment.");
        } else {
          setMsg(`Signup failed: ${error.message}`);
        }
        return;
      }

      if (data.user) {
        // If user specified an existing organization, add them to it as editor
        if (organizationId && form.organization.trim()) {
          try {
            await supa
              .from("user_organizations")
              .insert({
                user_id: data.user.id,
                organization_id: organizationId,
                role: 'editor', // Default role for joining existing org
              });
          } catch (orgError) {
            console.error("Error joining organization:", orgError);
            // Don't fail the signup for this
          }
        }

        if (!data.user.email_confirmed_at) {
          setMsg(`Account created successfully! Please check your email (${form.email}) to confirm your account. Your username is: ${uniqueUsername}`);
        } else {
          setMsg(`Account created successfully! Your username is: ${uniqueUsername}. Redirecting...`);
          setTimeout(() => {
            router.push("/signin");
          }, 3000);
        }
      }

    } catch (err: any) {
      console.error("Unexpected signup error:", err);
      setMsg("An unexpected error occurred. Please try again or contact support.");
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
            Need help? Contact support for assistance
          </p>
        </div>
      </div>
    </div>
  );
}
