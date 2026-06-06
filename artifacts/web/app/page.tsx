import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Welcome</h1>
        <p className="text-gray-500 mb-8">Get started by signing in.</p>
        {user ? (
          <Link
            href="/dashboard"
            className="inline-block bg-gray-900 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-700 transition"
          >
            Go to dashboard
          </Link>
        ) : (
          <div className="flex gap-3 justify-center">
            <Link
              href="/login"
              className="inline-block bg-gray-900 text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-700 transition"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-block bg-white text-gray-900 border border-gray-200 rounded-lg px-5 py-2.5 text-sm font-medium hover:bg-gray-50 transition"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
