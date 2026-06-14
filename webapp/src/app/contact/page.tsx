"use client";

import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Mail,
  MapPin,
  Clock,
  MessageSquareText,
  Send,
  CheckCircle2,
  Asterisk,
  ArrowRight,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/core/utils";
import { shell } from "@/lib/styles";
import {
  BlockShadowButton,
  FormInput,
  FormTextareaField,
  GhostOutlineButton,
  Header,
} from "@/components/ui";
import { AltchaField, readAltchaPayload } from "@/features/auth";
import { getAltchaChallengeUrl } from "@/api/auth";
import { collectFeedbackClientMeta } from "@/api/feedback";
import { submitContactLead } from "@/api/contact";

import {
  CONTACT_TOPIC_SUGGESTIONS,
  PRODUCT_SITE_LINKS,
} from "@/lib/shell/siteLinks";

export default function ContactPage() {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const altchaOn = Boolean(getAltchaChallengeUrl()) && !token;

  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");

  const setTopic = (val: string) => {
    const input = document.getElementById(
      "contact-topic",
    ) as HTMLInputElement | null;
    if (input) input.value = val;
  };

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      setStatus("sending");

      const fd = new FormData(form);
      const topic = String(fd.get("topic") ?? "").trim();
      const message = String(fd.get("message") ?? "").trim();
      const company = String(fd.get("company") ?? "").trim();
      const hp = String(fd.get("_hp") ?? "").trim();

      if (hp) {
        setStatus("done");
        return;
      }

      let altchaPayload: string | undefined;
      if (altchaOn) {
        altchaPayload = readAltchaPayload(form);
        if (!altchaPayload) {
          toast.error("Please complete the security challenge.", {
            id: "contact-form",
          });
          setStatus("idle");
          return;
        }
      }

      const clientMeta = collectFeedbackClientMeta();
      const res = await submitContactLead(
        {
          topic,
          message,
          company: company || undefined,
          fullName: token
            ? undefined
            : String(fd.get("fullName") ?? "").trim() || undefined,
          email: token
            ? undefined
            : String(fd.get("email") ?? "").trim() || undefined,
          altcha: altchaPayload,
          clientMeta,
        },
        token,
      );

      if (!res.success) {
        toast.error(res.message ?? "Could not send. Try again.", {
          id: "contact-form",
        });
        setStatus("idle");
        return;
      }
      toast.success("Message sent. We will get back to you soon.", {
        id: "contact-success",
      });
      setStatus("done");
      form.reset();
    },
    [altchaOn, token],
  );

  if (!isHydrated) {
    return (
      <div
        className={cn(
          shell.contentRail,
          "flex min-h-[60vh] items-center justify-center py-16",
        )}
      >
        <div className="mx-auto w-full max-w-md border-4 border-border bg-card p-8 text-center shadow">
          <div className="mx-auto mb-4 size-12 animate-spin border-4 border-primary border-t-transparent" />
          <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Initializing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(shell.contentRail, "py-8 pb-24 md:py-12")}>
      <div className="w-full space-y-8">
        <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] xl:gap-12">
          <div className="space-y-8">
            <Header
              systemLabel="System.Contact_Active"
              showAccountContext={!!token}
              title={
                <>
                  Get in <span className="text-primary">touch</span>
                </>
              }
              description="Partnerships, press, or product feedback — our team routes every note to the right desk."
              titleIcon={<MessageSquareText strokeWidth={2} />}
            />

            {/* Form Section */}
            <section className="border-4 border-border bg-card shadow">
              <div className="flex items-center justify-between border-b-4 border-border bg-muted/30 px-6 py-4">
                <h2 className="flex items-center gap-3 text-sm font-black uppercase tracking-widest">
                  <MessageSquareText className="size-5 text-primary" />
                  New Message
                </h2>
                {!token && <Asterisk className="size-4 text-primary" />}
              </div>

              {status === "done" ? (
                <div className="flex flex-col items-center gap-6 px-6 py-20 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 animate-ping bg-primary/20" />
                    <CheckCircle2
                      className="relative size-20 text-primary"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase tracking-tight">
                      Transmission Sent
                    </h3>
                    <p className="mx-auto max-w-xs text-sm font-medium text-muted-foreground">
                      We&apos;ve received your lead. Our average response time
                      is currently{" "}
                      <span className="text-foreground underline underline-offset-2">
                        48 hours
                      </span>
                      .
                    </p>
                  </div>
                  <BlockShadowButton
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setStatus("idle")}
                    className="group"
                  >
                    Send another{" "}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </BlockShadowButton>
                </div>
              ) : (
                <form
                  className="space-y-6 p-6 sm:p-10"
                  onSubmit={(ev) => void onSubmit(ev)}
                  noValidate
                >
                  <input
                    type="text"
                    name="_hp"
                    tabIndex={-1}
                    className="absolute -left-[9999px] h-0 w-0 opacity-0"
                  />

                  <div className="grid gap-6">
                    {!token ? (
                      <div className="grid gap-6 sm:grid-cols-2">
                        <FormInput
                          id="contact-fullName"
                          label="Full name"
                          name="fullName"
                          required
                          minLength={2}
                          maxLength={120}
                          placeholder="John Doe"
                          autoComplete="name"
                        />
                        <FormInput
                          id="contact-email"
                          label="Email address"
                          name="email"
                          type="email"
                          required
                          maxLength={254}
                          placeholder="john@example.com"
                          autoComplete="email"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 border-4 border-dashed border-border bg-muted/10 p-4">
                        <div className="size-3 bg-primary" />
                        <p className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
                          Authenticated as{" "}
                          <span className="text-foreground">Current User</span>
                        </p>
                      </div>
                    )}

                    <FormInput
                      id="contact-company"
                      label="Company (optional)"
                      name="company"
                      maxLength={120}
                      placeholder="Acme Inc."
                      autoComplete="organization"
                    />

                    <div className="space-y-3">
                      <FormInput
                        id="contact-topic"
                        label="Topic"
                        name="topic"
                        required
                        minLength={2}
                        maxLength={200}
                        placeholder="What's this about?"
                      />
                      <div className="flex flex-wrap gap-2">
                        {CONTACT_TOPIC_SUGGESTIONS.map((t) => (
                          <GhostOutlineButton
                            key={t}
                            type="button"
                            size="sm"
                            onClick={() => setTopic(t)}
                          >
                            {t}
                          </GhostOutlineButton>
                        ))}
                      </div>
                    </div>

                    <FormTextareaField
                      id="contact-message"
                      label="Message"
                      name="message"
                      required
                      minLength={10}
                      maxLength={5000}
                      rows={5}
                    />
                  </div>

                  {altchaOn && (
                    <div className="border-t-4 border-dashed border-border pt-6">
                      <AltchaField
                        enabled
                        floating="bottom"
                        floatingAnchor="#contact-submit"
                      />
                    </div>
                  )}

                  <BlockShadowButton
                    id="contact-submit"
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={status === "sending"}
                    shadow="md"
                    className={cn(
                      "group",
                      status === "sending" && "animate-pulse",
                    )}
                  >
                    <Send
                      className={cn(
                        "size-5",
                        status === "sending" && "animate-bounce",
                      )}
                      aria-hidden
                    />
                    {status === "sending" ? "Processing..." : "Send message"}
                  </BlockShadowButton>
                </form>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <div className="border-4 border-border bg-card shadow">
              <div className="border-b-4 border-border bg-muted/30 px-6 py-4">
                <h2 className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-foreground">
                  <MapPin
                    className="size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  Logistics
                </h2>
              </div>

              <div className="divide-y-4 divide-dashed divide-border px-6">
                <div className="space-y-3 py-5">
                  <div className="flex items-center gap-2">
                    <MapPin
                      className="size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Headquarters
                    </h3>
                  </div>
                  <p className="text-sm font-bold leading-snug text-foreground">
                    Syntax Stories HQ
                  </p>
                  <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                    Remote-first · India operations
                  </p>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-primary">
                    Asia/Kolkata · IST (UTC+5:30)
                  </p>
                </div>

                <div className="space-y-3 py-5">
                  <div className="flex items-center gap-2">
                    <Mail
                      className="size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Direct line
                    </h3>
                  </div>
                  <a
                    href="mailto:hello@syntaxstories.example"
                    className="group inline-flex w-full max-w-full items-center justify-between gap-2 border-4 border-border bg-muted/10 px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-tight text-foreground shadow transition-all hover:border-primary/50 hover:text-primary"
                  >
                    <span className="min-w-0 truncate">
                      hello@syntaxstories.example
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 -rotate-45 transition-transform group-hover:rotate-0"
                      aria-hidden
                    />
                  </a>
                  <p className="text-[10px] font-medium leading-relaxed text-muted-foreground">
                    For billing or account issues, add “URGENT” to the subject
                    when it is time-sensitive.
                  </p>
                </div>

                <div className="space-y-4 py-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center border-2 border-border bg-muted/30">
                      <Clock className="size-5 text-primary" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Service window
                      </p>
                      <p className="mt-0.5 text-sm font-black text-foreground">
                        Mon–Fri · 10:00–19:00 IST
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 border-t-2 border-dashed border-border pt-4">
                    <div className="flex size-10 shrink-0 items-center justify-center border-2 border-border bg-muted/30">
                      <Timer className="size-5 text-primary" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Target first reply
                      </p>
                      <p className="mt-0.5 text-sm font-black text-foreground">
                        Within 2 business days
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-4 border-border bg-primary p-6 shadow">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary-foreground">
                Quick Links
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-2">
                {PRODUCT_SITE_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="flex items-center justify-between border-2 border-primary-foreground bg-primary-foreground/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary-foreground hover:bg-primary-foreground hover:text-primary transition-colors"
                  >
                    {l.label}
                    <ArrowRight className="size-3" />
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
