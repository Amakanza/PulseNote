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

// Network Debugger Component for troubleshooting
const NetworkDebugger = () => {
  const [testResults, setTestResults] = useState<any>({});
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const results: any = {};
    
    try {
      // Test 1: Environment variables
      results.envVars = {
        success: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
        keyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      };

      // Test 2: Basic fetch to Supabase
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
          }
        });
        results.basicFetch = {
          success: response.ok,
          status: response.status,
          statusText: response.statusText
        };
      } else {
        results.basicFetch = {
          success: false,
          error: 'Missing environment variables'
        };
      }

      // Test 3: Supabase client
      try {
        const supa = supabaseClient();
        results.clientInit = { success: true };
        
        // Test simple query
        const { data, error } = await supa.from('profiles').select('id').limit(1);
        results.simpleQuery = {
          success: !error,
          error: error?.message || null,
          dataReceived: !!data
        };
      } catch (clientError: any) {
        results.clientInit = {
          success: false,
          error: clientError.message
        };
      }

      // Test 4: Auth endpoint specifically
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        try {
          const authResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`, {
            method: 'POST',
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'test123'
            })
          });
          
          // We expect this to fail with a specific error, but it should connect
          results.authEndpoint = {
            success: authResponse.status !== 0, // 0 means network error
            status: authResponse.status,
            reachable: true
          };
        } catch (authError: any) {
          results.authEndpoint = {
            success: false,
            error: authError.message,
            reachable: false
          };
        }
      }

    } catch (error: any) {
      results.generalError = error.message;
    }

    setTestResults(results);
    setTesting(false);
  };

  return (
    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-semibold mb-2 text-yellow-800">🔧 Network Diagnostic Tool</h3>
      <p className="text-sm text-yellow-700 mb-3">
        If signup is failing, run this test to identify connection issues.
      </p>
      
      <button 
        onClick={runTests} 
        disabled={testing}
        className="btn btn-sm bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
      >
        {testing ? 'Testing...' : 'Run Connection Tests'}
      </button>
      
      {Object.keys(testResults).length > 0 && (
        <div className="mt-3 space-y-2 text-xs">
          <div className="font-medium text-yellow-800">Test Results:</div>
          {Object.entries(testResults).map(([test, result]: [string, any]) => (
            <div key={test} className="flex justify-between items-start">
              <span className="font-medium">{test}:</span>
              <div className="text-right ml-2">
                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.success ? '✓ Pass' : '✗ Fail'}
                </span>
                {result.error && (
                  <div className="text-red-600 text-xs mt-1">{result.error}</div>
                )}
                {result.status && (
                  <div className="text-gray-600 text-xs">Status: {result.status}</div>
                )}
              </div>
            </div>
          ))}
          
          {testResults.envVars && (
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
              <div><strong>Supabase URL:</strong> {testResults.envVars.url}</div>
              <div><strong>API Key exists:</strong> {testResults.envVars.keyExists ? 'Yes' : 'No'}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
  const [showDebugger, setShowDebugger] = useState(false);
  const router = useRouter();

  // Generate username from initials
  const generateUsername = (firstName: string, lastName: string): string => {
    const firstInitial = firstName.trim().charAt(0).toUpperCase();
    const lastInitial = lastName.trim().charAt(0).toUpperCase();
    return firstInitial + lastInitial;
  };

  // Check if username exists and generate unique one
  const generateUniqueUsername = async (baseUsername: string, organizationName?: string): Promise<string> => {
    try {
      const supa = supabaseClient();
      let username = baseUsername;
      let counter = 1;

      while (counter <= 999) {
        console.log(`Checking username availability: ${username}`);
        
        // Check if username exists
        const { data, error } = await supa
          .from("profiles")
          .select("username")
          .eq("username", username)
          .limit(1);

        if (error) {
          console.error("Error checking username:", error);
          return baseUsername; // Fallback to base username
        }

        if (!data || data.length === 0) {
          console.log(`Username ${username} is available`);
          return username; // Username is available
        }

        // Username exists, try with number
        username = baseUsername + counter;
        counter++;
      }

      // Safety fallback
      const fallback = baseUsername + Math.floor(Math.random() * 10000);
      console.log(`Using random fallback username: ${fallback}`);
      return fallback;
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
    console.log("=== SIGNUP ATTEMPT STARTED ===");
    
    const validationError = validateForm();
    if (validationError) {
      console.log("Validation failed:", validationError);
      setMsg(validationError);
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      console.log("Initializing Supabase client...");
      const supa = supabaseClient();
      
      // Test basic connectivity first
      console.log("Testing Supabase connectivity...");
      try {
        const { data: connectionTest, error: connectionError } = await supa
          .from('profiles')
          .select('id')
          .limit(1);
        
        console.log("Connection test result:", { 
          success: !connectionError, 
          error: connectionError?.message 
        });
        
        if (connectionError && (
          connectionError.message.includes('Failed to fetch') ||
          connectionError.message.includes('NetworkError') ||
          connectionError.message.includes('fetch')
        )) {
          throw new Error('Unable to connect to the authentication service. Please check your internet connection and try again.');
        }
      } catch (connErr: any) {
        console.error("Connection test failed:", connErr);
        if (connErr.message.includes('Unable to connect')) {
          throw connErr;
        }
        // Continue if it's just a permission error (expected for unauthenticated requests)
      }
      
      // Find existing organization if specified
      let organizationId = null;
      if (form.organization.trim()) {
        console.log("Looking up organization:", form.organization.trim());
        try {
          const { data: existingOrg, error: orgError } = await supa
            .from("organizations")
            .select("id")
            .eq("name", form.organization.trim())
            .single();

          console.log("Organization lookup result:", { existingOrg, orgError });
          
          if (existingOrg) {
            organizationId = existingOrg.id;
            console.log("Found existing organization with ID:", organizationId);
          }
        } catch (orgError: any) {
          console.warn("Organization lookup failed (continuing without):", orgError.message);
          // Continue without organization
        }
      }

      // Generate unique username
      console.log("Generating username...");
      const baseUsername = generateUsername(form.firstName, form.lastName);
      console.log("Base username:", baseUsername);
      
      let uniqueUsername;
      try {
        uniqueUsername = await generateUniqueUsername(baseUsername, form.organization);
        console.log("Final username:", uniqueUsername);
      } catch (usernameError: any) {
        console.warn("Username generation failed, using fallback:", usernameError.message);
        uniqueUsername = baseUsername + Math.floor(Math.random() * 1000);
      }

      // Prepare signup data
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

      console.log("Signup data prepared:", {
        email: signupData.email,
        password: "[HIDDEN]",
        metadata: signupData.options.data
      });

      // Attempt signup
      console.log("Calling Supabase auth.signUp...");
      const { data, error } = await supa.auth.signUp(signupData);

      console.log("Supabase signup response:", {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userConfirmed: data?.user?.email_confirmed_at ? true : false,
        errorExists: !!error,
        errorMessage: error?.message,
        errorStatus: error?.status
      });

      if (error) {
        console.error("Signup error details:", {
          message: error.message,
          status: error.status,
          name: error.name,
          fullError: error
        });
        
        // Handle specific error types
        const errorMessage = error.message?.toLowerCase() || '';
        
        if (errorMessage.includes('user already registered') || 
            errorMessage.includes('already registered') ||
            errorMessage.includes('email address already registered')) {
          setMsg("This email address is already registered. Please try signing in instead.");
        } else if (errorMessage.includes('invalid email') || 
                   (errorMessage.includes('email') && errorMessage.includes('invalid'))) {
          setMsg("Please enter a valid email address.");
        } else if (errorMessage.includes('password') && 
                   (errorMessage.includes('6') || errorMessage.includes('short'))) {
          setMsg("Password must be at least 6 characters long.");
        } else if (errorMessage.includes('rate limit') || 
                   errorMessage.includes('too many') ||
                   errorMessage.includes('rate exceeded')) {
          setMsg("Too many signup attempts. Please wait a few minutes and try again.");
        } else if (errorMessage.includes('network') || 
                   errorMessage.includes('fetch') ||
                   errorMessage.includes('failed to fetch')) {
          setMsg("Network error. Please check your internet connection and try again.");
        } else if (errorMessage.includes('timeout') || 
                   errorMessage.includes('504') ||
                   error.status === 504) {
          setMsg("The server is taking too long to respond. Please try again in a moment.");
        } else if (errorMessage.includes('database') || 
                   errorMessage.includes('constraint') ||
                   errorMessage.includes('saving new user')) {
          setMsg("There was a database error creating your account. This might be a temporary issue. Please try again or contact support if the problem persists.");
        } else if (errorMessage.includes('forbidden') || 
                   error.status === 403) {
          setMsg("Account creation is currently restricted. Please contact support for assistance.");
        } else if (errorMessage.includes('cors') || 
                   errorMessage.includes('cross-origin')) {
          setMsg("Configuration error. Please contact support to resolve this issue.");
        } else if (!error.message || 
                   error.message.trim() === '' || 
                   error.message === '{}' ||
                   error.message === 'null') {
          setMsg("An unknown error occurred during signup. Please try again. If the problem persists, please contact support.");
          console.error("Empty error message received. Full error object:", JSON.stringify(error, null, 2));
        } else {
          setMsg(`Signup failed: ${error.message}`);
        }
        return;
      }

      // Validate response data
      if (!data) {
        console.error("No data returned from signup");
        setMsg("Signup request completed but no response data received. Please try signing in or contact support.");
        return;
      }

      if (!data.user) {
        console.error("No user in response data:", data);
        setMsg("Account creation may have succeeded, but user data is missing. Please try signing in.");
        return;
      }

      // Success!
      console.log("Signup successful! User ID:", data.user.id);
      console.log("Email confirmed:", !!data.user.email_confirmed_at);
      
      if (!data.user.email_confirmed_at) {
        setMsg(`Account created successfully! Please check your email (${form.email}) to confirm your account before signing in. Your username is: ${uniqueUsername}`);
      } else {
        setMsg(`Account created successfully! Your username is: ${uniqueUsername}. Redirecting to sign in...`);
        setTimeout(() => {
          router.push("/signin");
        }, 3000);
      }

      console.log("=== SIGNUP COMPLETED SUCCESSFULLY ===");

    } catch (err: any) {
      console.error("=== UNEXPECTED SIGNUP ERROR ===");
      console.error("Error details:", {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
        cause: err?.cause,
        fullError: err
      });
      
      // Handle different types of unexpected errors
      if (err?.message?.includes('fetch') || 
          err?.message?.includes('network') ||
          err?.message?.includes('NetworkError')) {
        setMsg("Network error. Please check your internet connection and try again.");
      } else if (err?.message?.includes('timeout') || 
                 err?.message?.includes('aborted')) {
        setMsg("Request timed out. Please try again.");
      } else if (err?.message?.includes('Unable to connect')) {
        setMsg(err.message); // Use our custom connection error message
      } else {
        const errorMsg = err?.message || err?.toString() || "An unexpected error occurred";
        setMsg(`An unexpected error occurred: ${errorMsg}. Please try again or contact support if the problem persists.`);
      }
    } finally {
      setLoading(false);
      console.log("=== SIGNUP ATTEMPT FINISHED ===");
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
              {/* Show debugger option on errors */}
              {!msg.includes("successfully") && !showDebugger && (
                <button
                  onClick={() => setShowDebugger(true)}
                  className="ml-2 text-xs underline hover:no-underline"
                >
                  Show diagnostic tool
                </button>
              )}
            </div>
          )}

          {/* Network Debugger */}
          {showDebugger && <NetworkDebugger />}
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
