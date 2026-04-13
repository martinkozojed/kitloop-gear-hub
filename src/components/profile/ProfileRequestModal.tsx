import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import ProfileRequestForm from "@/components/profile/ProfileRequestForm";
import type { PublicProduct } from "@/types/profile";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  providerName: string;
  selectedProduct?: PublicProduct | null;
  onClearSelection?: () => void;
}

export function ProfileRequestTrigger({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-16 right-4 z-40 lg:hidden">
      <Button size="lg" onClick={onClick} className="shadow-lg gap-2">
        <Send className="h-4 w-4" />
        {t("publicProfile.floatingCta")}
      </Button>
    </div>
  );
}

export default function ProfileRequestModal({
  open,
  onOpenChange,
  providerId,
  providerName,
  selectedProduct,
  onClearSelection,
}: Props) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-xl"
      >
        <SheetHeader className="mb-4">
          <SheetTitle>{t("publicProfile.requestTitle")}</SheetTitle>
          <SheetDescription>{providerName}</SheetDescription>
        </SheetHeader>
        <ProfileRequestForm
          providerId={providerId}
          selectedProduct={selectedProduct}
          onClearSelection={onClearSelection}
          onSuccess={() => {
            setTimeout(() => onOpenChange(false), 3000);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
