import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { supabase } from "@/lib/supabase";
import { fetchProviderToken } from "@/services/providerProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Send,
} from "lucide-react";
import type { PublicProduct } from "@/types/profile";

const today = () => new Date().toISOString().split("T")[0];

function createFormSchema(t: TFunction) {
  return z
    .object({
      name: z.string().min(2, t("publicProfile.requestNameMin")),
      email: z
        .string()
        .email(t("publicProfile.requestInvalidEmail"))
        .or(z.literal(""))
        .optional(),
      phone: z.string().optional(),
      startDate: z.string().min(1, t("publicProfile.requestDateRequired")),
      endDate: z.string().min(1, t("publicProfile.requestDateRequired")),
      notes: z.string().max(2000).optional(),
      variantId: z.string().optional(),
      surname: z.string().max(0, "").optional(),
    })
    .refine(
      (d) =>
        (d.email && d.email.length > 0) ||
        (d.phone && d.phone.length >= 3),
      {
        message: t("publicProfile.requestEmailOrPhone"),
        path: ["email"],
      },
    )
    .refine((d) => d.startDate >= today(), {
      message: t("publicProfile.requestDateFuture"),
      path: ["startDate"],
    })
    .refine((d) => d.endDate > d.startDate, {
      message: t("publicProfile.requestDateEndAfterStart"),
      path: ["endDate"],
    });
}

function useAvailabilityCheck(
  variantId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined,
) {
  const [status, setStatus] = useState<
    "idle" | "loading" | "available" | "unavailable"
  >("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!variantId || !startDate || !endDate || endDate <= startDate) {
      setStatus("idle");
      return;
    }

    setStatus("loading");
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc(
          "check_variant_availability",
          {
            p_variant_id: variantId,
            p_start_date: `${startDate}T00:00:00+00:00`,
            p_end_date: `${endDate}T23:59:59+00:00`,
          },
        );
        if (error) {
          setStatus("idle");
          return;
        }
        setStatus(data === true ? "available" : "unavailable");
      } catch {
        setStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timerRef.current);
  }, [variantId, startDate, endDate]);

  return status;
}

interface Props {
  providerId: string;
  selectedProduct?: PublicProduct | null;
  onClearSelection?: () => void;
  onSuccess?: () => void;
}

export default function ProfileRequestForm({
  providerId,
  selectedProduct,
  onClearSelection,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formSchema = useMemo(() => createFormSchema(t), [t]);

  const activeVariants = (selectedProduct?.product_variants ?? []).filter(
    (v) => v.is_active !== false,
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      startDate: "",
      endDate: "",
      notes: "",
      variantId: "",
      surname: "",
    },
  });

  const watchedVariant = form.watch("variantId");
  const watchedStart = form.watch("startDate");
  const watchedEnd = form.watch("endDate");

  const availability = useAvailabilityCheck(
    watchedVariant,
    watchedStart,
    watchedEnd,
  );

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (values.surname) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Fetch token at submit time only — never cached in state
      const token = await fetchProviderToken(providerId);
      if (!token) {
        setSubmitError(t("publicProfile.requestUnavailable"));
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "submit_request",
        {
          body: {
            token,
            customer_name: values.name,
            customer_email: values.email || null,
            customer_phone: values.phone || null,
            requested_start_date: values.startDate,
            requested_end_date: values.endDate,
            requested_gear_text: selectedProduct?.name || null,
            notes: values.notes || null,
            product_variant_id: values.variantId || null,
          },
        },
      );

      if (error) {
        // supabase.functions.invoke puts non-2xx responses into error
        // with the original status in error.context?.status
        const status = (error as { context?: { status?: number } }).context?.status;
        if (status === 429) {
          setSubmitError(t("publicProfile.requestRateLimit"));
          return;
        }
        if (status === 404) {
          setSubmitError(t("publicProfile.requestUnavailable"));
          return;
        }
        throw new Error(error.message ?? "Submit failed");
      }

      if (data?.error) {
        setSubmitError(data.error);
        return;
      }

      setIsSuccess(true);
      onSuccess?.();
    } catch {
      setSubmitError(t("publicProfile.requestError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setSubmitError(null);
    form.reset();
    onClearSelection?.();
  };

  if (isSuccess) {
    return (
      <Card>
        <CardContent className="py-10 flex flex-col items-center text-center">
          <CheckCircle2 className="h-10 w-10 text-brand-500 mb-3" />
          <h3 className="text-lg font-semibold mb-1">
            {t("publicProfile.requestSuccess")}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {t("publicProfile.requestSuccessDesc")}
          </p>
          <Button variant="outline" size="sm" onClick={handleReset}>
            {t("publicProfile.requestAnother")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4 shrink-0" />
          {t("publicProfile.requestTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* Selected product */}
            {selectedProduct && (
              <div className="flex items-center gap-2 rounded-md border p-2.5 bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedProduct.name}
                  </p>
                  <Badge variant="outline" className="text-xs mt-0.5">
                    {selectedProduct.category}
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="shrink-0 p-1 rounded-sm hover:bg-muted transition-colors"
                  aria-label={t("publicProfile.requestClearSelection")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Variant select + availability badge */}
            {selectedProduct && activeVariants.length > 1 && (
              <FormField
                control={form.control}
                name="variantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("publicProfile.requestVariant")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "publicProfile.requestVariantPlaceholder",
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeVariants.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availability === "loading" && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {t("publicProfile.availabilityChecking")}
                      </p>
                    )}
                    {availability === "available" && (
                      <Badge
                        variant="success"
                        className="mt-1.5 text-xs gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {t("publicProfile.availabilityLikely")}
                      </Badge>
                    )}
                    {availability === "unavailable" && (
                      <Badge
                        variant="warning"
                        className="mt-1.5 text-xs gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {t("publicProfile.availabilityUnlikely")}
                      </Badge>
                    )}
                  </FormItem>
                )}
              />
            )}

            {/* Honeypot */}
            <div aria-hidden="true" style={{ display: "none" }}>
              <FormField
                control={form.control}
                name="surname"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} tabIndex={-1} autoComplete="off" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("publicProfile.requestName")} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t("publicProfile.requestNamePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("publicProfile.requestEmail")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t("publicProfile.requestEmailPlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("publicProfile.requestPhone")}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder={t("publicProfile.requestPhonePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("publicProfile.requestDateFrom")} *</FormLabel>
                    <FormControl>
                      <Input type="date" min={today()} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("publicProfile.requestDateTo")} *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={form.watch("startDate") || today()}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("publicProfile.requestNotes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      rows={3}
                      placeholder={
                        selectedProduct
                          ? t("publicProfile.requestNotesWithProduct")
                          : t("publicProfile.requestNotesPlaceholder")
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("publicProfile.requestSubmitting")}
                </>
              ) : (
                t("publicProfile.requestSubmit")
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
