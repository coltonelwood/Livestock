import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin · Users" };

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Users</h1>
      <div className="grid gap-2">
        {(users ?? []).map((u) => (
          <Card key={u.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{u.full_name || "—"}</p>
              <p className="text-sm text-muted-foreground">{u.email}</p>
            </div>
            {u.platform_role === "platform_admin" && (
              <Badge>Platform admin</Badge>
            )}
          </Card>
        ))}
        {(!users || users.length === 0) && (
          <p className="text-sm text-muted-foreground">No users yet.</p>
        )}
      </div>
    </>
  );
}
