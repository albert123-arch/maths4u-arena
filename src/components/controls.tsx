"use client";
import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "outline" | "text";
function buttonClass(variant: Variant | undefined, className = "") {
  const resolved = variant ?? (className.split(/\s+/).includes("quiet") ? "text" : "outline");
  return `ui-button ui-button--${resolved} ${className}`.trim();
}
export function Button({ variant, className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...props} className={buttonClass(variant, className)} />;
}
export function ButtonLink({ variant, className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={buttonClass(variant, className)} />;
}
export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input {...props} className={`ui-input ${className}`.trim()} />;
}
export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select {...props} className={`ui-select ${className}`.trim()} />;
}
export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea {...props} className={`ui-textarea ${className}`.trim()} />;
}
