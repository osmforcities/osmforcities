"use client";

import { useContext } from "react";
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

interface HamburgerMenuProps {
  isLoggedIn: boolean;
  translations: {
    about: string;
    preferences: string;
    signOut: string;
    signIn: string;
  };
}

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

export default function HamburgerMenu({
  isLoggedIn,
  translations,
}: HamburgerMenuProps) {
  return (
    <>
      {/* Mobile Hamburger Menu */}
      <div className="md:hidden">
        <DialogTrigger>
          <Button
            aria-label="Open menu"
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Menu size={20} />
          </Button>

          <ModalOverlay className="fixed inset-0 z-50 bg-black/40 data-[entering]:animate-fade-in data-[exiting]:animate-fade-out">
            <Modal
              isDismissable
              className="fixed right-0 top-0 h-[100dvh] w-80 max-w-[85vw] outline-none data-[entering]:animate-slide-in data-[exiting]:animate-slide-out"
            >
              <Dialog className="h-full bg-white shadow-xl">
                <Heading slot="title" className="sr-only">
                  {"Main menu"}
                </Heading>

                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {"Menu"}
                    </h2>
                    <Button
                      slot="close"
                      aria-label="Close"
                      className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <X size={20} />
                    </Button>
                  </div>

                  {/* Menu Content */}
                  <div className="flex-1 p-4">
                    <CloseOnNav>
                      <NavActions
                        isLoggedIn={isLoggedIn}
                        translations={translations}
                        isMobile={true}
                      />
                    </CloseOnNav>
                  </div>
                </div>
              </Dialog>
            </Modal>
          </ModalOverlay>
        </DialogTrigger>
      </div>

      {/* Desktop Actions (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-4">
        <NavActions
          isLoggedIn={isLoggedIn}
          translations={translations}
          isMobile={false}
        />
      </div>
    </>
  );
}
