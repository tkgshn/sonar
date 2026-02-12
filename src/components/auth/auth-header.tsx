"use client";

export function AuthHeader({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-600">{email}</span>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}
