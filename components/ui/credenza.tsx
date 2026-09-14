"use client";

import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const desktopMediaQuery = "(min-width: 768px)";

export type CredenzaProps = {
  children?: React.ReactNode;
  className?: string;
  asChild?: boolean;
  render?: React.ReactElement;
} & React.HTMLAttributes<HTMLElement>;

export type RootCredenzaProps = {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
};

const Credenza = ({ children, ...props }: RootCredenzaProps) => {
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const Component = isDesktop ? Dialog : Drawer;

  return <Component {...props}>{children}</Component>;
};

const CredenzaTrigger = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const Component = isDesktop ? DialogTrigger : DrawerTrigger;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const CredenzaClose = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const Component = isDesktop ? DialogClose : DrawerClose;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const CredenzaContent = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const Component = isDesktop ? DialogContent : DrawerContent;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const CredenzaDescription = ({
  className,
  children,
  ...props
}: CredenzaProps) => {
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const Component = isDesktop ? DialogDescription : DrawerDescription;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const CredenzaHeader = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const Component = isDesktop ? DialogHeader : DrawerHeader;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const CredenzaTitle = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const Component = isDesktop ? DialogTitle : DrawerTitle;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

const CredenzaBody = ({ className, children, ...props }: CredenzaProps) => {
  return (
    <div
      className={cn(
        "max-h-[70dvh] overflow-y-auto px-4 py-2 md:px-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const CredenzaFooter = ({ className, children, ...props }: CredenzaProps) => {
  const isDesktop = useMediaQuery(desktopMediaQuery);
  const Component = isDesktop ? DialogFooter : DrawerFooter;

  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

export {
  Credenza,
  CredenzaTrigger,
  CredenzaClose,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaBody,
  CredenzaFooter,
  // Drop-in Dialog aliases
  Credenza as Dialog,
  CredenzaTrigger as DialogTrigger,
  CredenzaClose as DialogClose,
  CredenzaContent as DialogContent,
  CredenzaDescription as DialogDescription,
  CredenzaHeader as DialogHeader,
  CredenzaTitle as DialogTitle,
  CredenzaBody as DialogBody,
  CredenzaFooter as DialogFooter,
};
