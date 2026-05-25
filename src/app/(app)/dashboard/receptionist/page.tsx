import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/modules/dashboard/components/page-header";
import { SettingsForm } from "@/modules/receptionist/components/settings-form";
import { ChatWidget } from "@/modules/receptionist/components/chat-widget";
import { saveAgentAction, saveProfileAction } from "@/modules/receptionist/actions";
import { DEFAULT_GREETING } from "@/lib/ai/receptionist";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/modules/organizations/context";

export const metadata: Metadata = { title: "Lead Assistant" };

export default async function ReceptionistPage() {
  const { organization } = await requireOrg();
  const supabase = await createClient();

  const [{ data: agent }, { data: profile }] = await Promise.all([
    supabase
      .from("ai_agents")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ranch_profiles")
      .select("*")
      .eq("organization_id", organization.id)
      .maybeSingle(),
  ]);

  const faqText = (profile?.faq ?? [])
    .map((f) => `${f.question} :: ${f.answer}`)
    .join("\n");

  return (
    <>
      <PageHeader
        title="Lead Assistant"
        description="Catches buyers you miss — answers common questions, gets a name and phone number, and saves the lead."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assistant settings</CardTitle>
              <CardDescription>How it greets buyers and what it asks.</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm action={saveAgentAction}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={agent?.is_active ?? true}
                    className="size-4"
                  />
                  Receptionist is active
                </label>
                <div className="space-y-2">
                  <Label htmlFor="greeting">Greeting</Label>
                  <Input
                    id="greeting"
                    name="greeting"
                    defaultValue={agent?.greeting ?? DEFAULT_GREETING}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification_questions">
                    Qualification questions (one per line)
                  </Label>
                  <Textarea
                    id="qualification_questions"
                    name="qualification_questions"
                    rows={4}
                    defaultValue={(agent?.qualification_questions ?? []).join("\n")}
                    placeholder={"What are you looking for?\nWhat's your name and number?"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="system_prompt">Extra instructions (optional)</Label>
                  <Textarea
                    id="system_prompt"
                    name="system_prompt"
                    rows={3}
                    defaultValue={agent?.system_prompt ?? ""}
                  />
                </div>
              </SettingsForm>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business profile & FAQ</CardTitle>
              <CardDescription>The only facts it&apos;s allowed to share.</CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm action={saveProfileAction}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="display_name">Display name</Label>
                    <Input id="display_name" name="display_name" defaultValue={profile?.display_name ?? organization.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" name="location" defaultValue={profile?.location ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" defaultValue={profile?.email ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" name="website" defaultValue={profile?.website ?? ""} placeholder="https://" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">About your business</Label>
                  <Textarea id="bio" name="bio" rows={3} defaultValue={profile?.bio ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faq">FAQ (one per line: question :: answer)</Label>
                  <Textarea
                    id="faq"
                    name="faq"
                    rows={5}
                    defaultValue={faqText}
                    placeholder={"Do you deliver? :: Yes, within 100 miles.\nDo you sell halves? :: Yes, $4.50/lb hanging weight."}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="is_public"
                    defaultChecked={profile?.is_public ?? false}
                    className="size-4"
                  />
                  Show my profile publicly
                </label>
                {profile?.is_public && (
                  <p className="text-sm">
                    <a
                      href={`/ranch/${organization.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      View your public storefront →
                    </a>
                  </p>
                )}
              </SettingsForm>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Try it out</CardTitle>
              <CardDescription>
                Exactly what buyers see. Save your settings first to test changes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChatWidget
                organizationId={organization.id}
                businessName={profile?.display_name ?? organization.name}
                greeting={agent?.greeting ?? DEFAULT_GREETING}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
