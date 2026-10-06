import { LogOut } from "lucide-react";
import { signOut } from "@/server/actions/session";
import { Button } from "@/components/ui";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" size="compact" icon={LogOut}>
        Sign out
      </Button>
    </form>
  );
}
