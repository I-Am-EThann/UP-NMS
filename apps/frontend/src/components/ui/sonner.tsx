"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--surface-raised)",
          "--normal-text": "var(--ink-900)",
          "--normal-border": "var(--border-subtle)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
