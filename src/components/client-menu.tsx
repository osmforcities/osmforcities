"use client";

import { useContext } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  OverlayTriggerStateContext,
} from "react-aria-components";
import NavActions from "@/components/nav-actions";

interface ClientMenuProps {
  isLoggedIn: boolean;
}

/**
 * Mobile navigation menu - slide-in modal with navigation links
 */
export default function ClientMenu({ isLoggedIn }: ClientMenuProps) {
  const t = useTranslations("Navigation");

  return (
    <DialogTrigger>
      <Button
        aria-label="Open menu"
        className="p-3 rounded text-gray-600 hover:text-gray-900 hover:bg-olive-100 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2"
      >
        <Menu size={28} />
      </Button>

      <ModalOverlay className="fixed inset-0 z-50 bg-black/40 data-[entering]:animate-fade-in data-[exiting]:animate-fade-out">
        <Modal
          isDismissable
          className="fixed right-0 top-0 h-[100dvh] w-80 max-w-[85vw] outline-none data-[entering]:animate-slide-in data-[exiting]:animate-slide-out"
        >
          <Dialog className="h-full bg-white shadow-xl">
            <Heading slot="title" className="sr-only">
              {t("mainMenu")}
            </Heading>

            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">{t("menu")}</h2>
                <Button
                  slot="close"
                  aria-label={t("close")}
                  className="p-3 rounded text-gray-600 hover:text-gray-900 hover:bg-olive-100 focus:outline-none focus:ring-2 focus:ring-olive-500"
                >
                  <X size={28} />
                </Button>
              </div>

              {/* Menu Content */}
              <div className="flex-1 p-4">
                <CloseOnNav>
                  <NavActions
                    isLoggedIn={isLoggedIn}
                    translations={{
                      dashboard: t("dashboard"),
                      about: t("about"),
                      preferences: t("preferences"),
                      signOut: t("signOut"),
                      signIn: t("signIn"),
                    }}
                    isMobile={true}
                  />
                </CloseOnNav>
              </div>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}

/**
 * Closes mobile menu when navigation link is clicked
 */
function CloseOnNav({ children }: { children: React.ReactNode }) {
  const state = useContext(OverlayTriggerStateContext)!;
  return (
    <nav
      aria-label="Primary"
      className="grid gap-3"
      onClick={(e) => {
        const el = e.target as HTMLElement;
        // Don't close on form submissions - let them complete first
        if (el.closest("form")) return;
        if (el.closest("a,button,[role=menuitem]")) state.close();
      }}
    >
      {children}
    </nav>
  );
}
