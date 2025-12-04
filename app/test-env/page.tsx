"use client";

export default function TestEnvPage() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
        <pre className="text-xs overflow-auto">
          {JSON.stringify(envVars, null, 2)}
        </pre>
      </div>
      <div className="mt-4">
        <p className="text-sm">
          {envVars.hasUrl && envVars.hasKey ? (
            <span className="text-green-600">✅ Environment variables are loaded correctly!</span>
          ) : (
            <span className="text-red-600">❌ Environment variables are missing!</span>
          )}
        </p>
      </div>
    </div>
  );
}
