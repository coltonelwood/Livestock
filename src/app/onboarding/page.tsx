import Link from "next/link";
import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/modules/marketing/components/logo";
import { CreateOrgForm } from "@/modules/organizations/components/create-org-form";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Set up your business" };

export default async function OnboardingPage() {
  await requireUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Logo className="h-8 w-8 text-primary" />
        <span className="font-display text-xl font-bold">OpenRange</span>
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Set up your business</CardTitle>
          <CardDescription>
            Create your organization. You can invite your team and add details
            later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrgForm />
        </CardContent>
      </Card>
    </div>
  );
}
