"use client";

import { useState, type FormEvent } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogTrigger,
  Heading,
  Input,
  Label,
  Modal,
  ModalOverlay,
  NumberField,
  Text,
} from "react-aria-components";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

type UserEditDialogProps = {
  user: { id: string; email: string; isAdmin: boolean; saveLimit: number | null };
  isSelf: boolean;
  defaultSaveLimit: number;
};

export function UserEditDialog({ user, isSelf, defaultSaveLimit }: UserEditDialogProps) {
  const t = useTranslations("UsersPage");

  return (
    <DialogTrigger>
      <Button
        aria-label={t("editUser", { email: user.email })}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {t("edit")}
      </Button>
      <ModalOverlay
        isDismissable
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 data-[entering]:animate-fade-in data-[exiting]:animate-fade-out"
      >
        <Modal className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
          <Dialog className="outline-none">
            {({ close }) => (
              <UserEditForm
                user={user}
                isSelf={isSelf}
                defaultSaveLimit={defaultSaveLimit}
                onDone={close}
              />
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}

function UserEditForm({
  user,
  isSelf,
  defaultSaveLimit,
  onDone,
}: UserEditDialogProps & { onDone: () => void }) {
  const t = useTranslations("UsersPage");
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [saveLimit, setSaveLimit] = useState(user.saveLimit ?? NaN);
  const [status, setStatus] = useState<"idle" | "saving" | "failed">("idle");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isAdmin,
        saveLimit: Number.isNaN(saveLimit) ? null : saveLimit,
      }),
    }).catch(() => null);
    if (!res?.ok) {
      setStatus("failed");
      return;
    }
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Heading slot="title" className="text-lg font-semibold text-black dark:text-white">
        {t("editUser", { email: user.email })}
      </Heading>

      <Checkbox
        isSelected={isAdmin}
        onChange={setIsAdmin}
        isDisabled={isSelf}
        className="group flex items-center gap-2 text-black data-[disabled]:opacity-60 dark:text-white"
      >
        <span
          aria-hidden="true"
          className="flex h-4 w-4 items-center justify-center rounded-sm border-2 border-gray-400 group-data-[selected]:border-olive-500 group-data-[selected]:bg-olive-500 group-data-[focus-visible]:ring-2 group-data-[focus-visible]:ring-olive-500"
        >
          <svg viewBox="0 0 12 12" className="hidden h-3 w-3 fill-none stroke-white stroke-2 group-data-[selected]:block">
            <polyline points="2 6 5 9 10 3" />
          </svg>
        </span>
        {t("admin")}
      </Checkbox>
      {isSelf && (
        <p className="-mt-3 text-sm text-gray-500 dark:text-gray-400">{t("ownAdminLocked")}</p>
      )}

      <NumberField
        value={saveLimit}
        onChange={setSaveLimit}
        minValue={1}
        step={1}
        className="flex flex-col gap-1"
      >
        <Label className="text-sm font-medium text-black dark:text-white">{t("saveLimit")}</Label>
        <Input
          placeholder={t("saveLimitDefault", { limit: defaultSaveLimit })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-black dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />
        <Text slot="description" className="text-sm text-gray-500 dark:text-gray-400">
          {t("saveLimitHint", { limit: defaultSaveLimit })}
        </Text>
      </NumberField>

      {status === "failed" && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t("updateFailed")}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button slot="close" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          isDisabled={status === "saving"}
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          {t("updateUser")}
        </Button>
      </div>
    </form>
  );
}
