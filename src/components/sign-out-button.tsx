import { signOut } from "@/server/actions/session";

export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={`rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100 focus:outline-2 focus:outline-offset-2 focus:outline-blue-600 ${className}`}
      >
        Sign out
      </button>
    </form>
  );
}
