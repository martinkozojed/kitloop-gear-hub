import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { submitRequest } from "@/services/requestLink";
import { CheckCircle2, AlertCircle } from "lucide-react";

const requestFormSchema = z.object({
  customer_name: z.string().min(1, "Name is required").max(200),
  customer_email: z.string().email("Invalid email").optional().or(z.literal("")),
  customer_phone: z.string().max(30).optional(),
  requested_start_date: z.string().min(1, "Start date is required"),
  requested_end_date: z.string().min(1, "End date is required"),
  requested_gear_text: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  _hp: z.string().optional().or(z.literal("")),
}).refine(
  (data) => {
    const email = data.customer_email?.trim();
    const phone = data.customer_phone?.trim();
    return (email && email.length > 0) || (phone && phone.length >= 3);
  },
  { message: "Email or phone is required", path: ["customer_email"] }
).refine(
  (data) => {
    if (!data.requested_start_date || !data.requested_end_date) return true;
    return new Date(data.requested_start_date) < new Date(data.requested_end_date);
  },
  { message: "End date must be after start date", path: ["requested_end_date"] }
);

type RequestFormValues = z.infer<typeof requestFormSchema>;

type PageState = "form" | "success" | "invalid" | "error";

const RequestLink = () => {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("cs") ? "cs" : "en";
  const [pageState, setPageState] = React.useState<PageState>("form");
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  useEffect(() => {
    document.title = t("requestLink.pageTitle", "Send request");
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex, nofollow");
    return () => {
      meta?.setAttribute("content", "index, follow");
    };
  }, [t]);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      requested_start_date: "",
      requested_end_date: "",
      requested_gear_text: "",
      notes: "",
      _hp: "",
    },
  });

  const onSubmit = async (values: RequestFormValues) => {
    if (!token) return;
    setSubmitError(null);
    try {
      await submitRequest({
        token,
        customer_name: values.customer_name.trim(),
        customer_email: values.customer_email?.trim() || "",
        customer_phone: values.customer_phone?.trim() || "",
        requested_start_date: values.requested_start_date,
        requested_end_date: values.requested_end_date,
        requested_gear_text: values.requested_gear_text?.trim() || null,
        notes: values.notes?.trim() || null,
        _hp: values._hp ?? "",
      });
      setPageState("success");
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "";
      const status = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : 0;
      const retryAfter = err && typeof err === "object" && "retryAfterSeconds" in err ? (err as { retryAfterSeconds?: number }).retryAfterSeconds : undefined;
      if (status === 429) {
        setPageState("error");
        setSubmitError(t("requestLink.rateLimited", { seconds: retryAfter ?? 60 }) || "Too many requests. Please try again in a moment.");
      } else if (status === 404 || message?.toLowerCase().includes("invalid") || message?.toLowerCase().includes("expired")) {
        setPageState("invalid");
      } else {
        setPageState("error");
        setSubmitError(message || t("requestLink.errorGeneric", "Something went wrong. Please try again."));
      }
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-subtle flex flex-col">
        <header className="py-4 px-6 md:px-10 bg-white shadow-sm border-b border-border">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/onboarding" className="text-2xl font-bold flex items-center shrink-0">
              <span className="text-primary pr-0.5 tracking-tight">Kit</span>
              <span className="text-foreground tracking-wide">loop</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md shadow-card rounded-token-lg bg-white">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">{t("requestLink.invalidLink", "Invalid link.")}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-subtle flex flex-col">
      <header className="py-4 px-6 md:px-10 bg-white shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/onboarding" className="text-2xl font-bold flex items-center shrink-0">
            <span className="text-primary pr-0.5 tracking-tight">Kit</span>
            <span className="text-foreground tracking-wide">loop</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => i18n.changeLanguage(lang === "en" ? "cs" : "en")}
              aria-label={lang === "en" ? "Switch to Czech" : "Přepnout do angličtiny"}
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 rounded px-0.5"
            >
              {lang === "en" ? "CS" : "EN"}
            </button>
            <Link to="/onboarding" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← {t("requestLink.back", "Back")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg shadow-card rounded-token-lg bg-white border-border">
          {pageState === "success" && (
            <>
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" aria-hidden />
                </div>
                <CardTitle className="text-xl">{t("requestLink.successTitle", "Request sent")}</CardTitle>
                <CardDescription>{t("requestLink.successMessage", "The rental will contact you shortly.")}</CardDescription>
              </CardHeader>
            </>
          )}

          {(pageState === "invalid" || pageState === "error") && (
            <>
              <CardHeader className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <AlertCircle className="h-6 w-6 text-amber-600" aria-hidden />
                </div>
                <CardTitle className="text-xl">
                  {pageState === "invalid" ? t("requestLink.invalidLink", "Invalid or expired link") : t("requestLink.errorTitle", "Error")}
                </CardTitle>
                <CardDescription>
                  {pageState === "invalid" ? t("requestLink.invalidLinkMessage", "This link is no longer valid.") : submitError}
                </CardDescription>
              </CardHeader>
            </>
          )}

          {pageState === "form" && (
            <>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold tracking-tight">{t("requestLink.title", "Send a request")}</CardTitle>
                <CardDescription>{t("requestLink.subtitle", "Fill in the form and the rental will get back to you.")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">{t("requestLink.customer_name", "Name")} *</Label>
                    <Input
                      id="customer_name"
                      {...form.register("customer_name")}
                      placeholder={t("requestLink.customer_name_placeholder", "Your name")}
                      className="rounded-token-md"
                    />
                    {form.formState.errors.customer_name && (
                      <p className="text-xs text-destructive" role="alert">{form.formState.errors.customer_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_email">{t("requestLink.customer_email", "Email")} *</Label>
                    <Input
                      id="customer_email"
                      type="email"
                      {...form.register("customer_email")}
                      placeholder={t("requestLink.customer_email_placeholder", "email@example.com")}
                      className="rounded-token-md"
                    />
                    {form.formState.errors.customer_email && (
                      <p className="text-xs text-destructive" role="alert">{form.formState.errors.customer_email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">{t("requestLink.customer_phone", "Phone")}</Label>
                    <Input
                      id="customer_phone"
                      type="tel"
                      {...form.register("customer_phone")}
                      placeholder={t("requestLink.customer_phone_placeholder", "+420 123 456 789")}
                      className="rounded-token-md"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="requested_start_date">{t("requestLink.start_date", "From")} *</Label>
                      <Input
                        id="requested_start_date"
                        type="date"
                        {...form.register("requested_start_date")}
                        className="rounded-token-md"
                      />
                      {form.formState.errors.requested_start_date && (
                        <p className="text-xs text-destructive" role="alert">{form.formState.errors.requested_start_date.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="requested_end_date">{t("requestLink.end_date", "To")} *</Label>
                      <Input
                        id="requested_end_date"
                        type="date"
                        {...form.register("requested_end_date")}
                        className="rounded-token-md"
                      />
                      {form.formState.errors.requested_end_date && (
                        <p className="text-xs text-destructive" role="alert">{form.formState.errors.requested_end_date.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requested_gear_text">{t("requestLink.requested_gear", "What do you want to rent?")}</Label>
                    <Input
                      id="requested_gear_text"
                      {...form.register("requested_gear_text")}
                      placeholder={t("requestLink.requested_gear_placeholder", "e.g. skis, tent")}
                      className="rounded-token-md"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">{t("requestLink.notes", "Notes")}</Label>
                    <Textarea
                      id="notes"
                      {...form.register("notes")}
                      placeholder={t("requestLink.notes_placeholder", "Any other details")}
                      rows={3}
                      className="rounded-token-md"
                    />
                  </div>
                  {/* Honeypot: hidden from users; server rejects if filled (bot trap) */}
                  <div className="absolute -left-[9999px] w-1 h-1 overflow-hidden" aria-hidden>
                    <Label htmlFor="request_hp">Leave empty</Label>
                    <Input
                      id="request_hp"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      {...form.register("_hp")}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("requestLink.privacyNote", "By submitting you agree to the processing of your data.")}{" "}
                    <Link to="/privacy" className="text-primary hover:underline">{t("requestLink.privacyLink", "Privacy policy")}</Link>
                  </p>
                  <Button
                    type="submit"
                    variant="cta"
                    className="w-full rounded-token-md"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? t("requestLink.submitting", "Sending…") : t("requestLink.submit", "Send request")}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </div>
  );
};

export default RequestLink;
