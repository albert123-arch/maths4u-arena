"use client";
import { mixedNumberParts } from "@/lib/mixed-number";
import { Input } from "./controls";
import styles from "./mixed-number-input.module.css";

export function MixedNumberInput({ label, labels, value, onChange, describedBy, invalid, disabled, readOnly }: {
  label: string;
  labels?: readonly [string, string, string];
  value: string;
  onChange: (value: string) => void;
  describedBy: string;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  const parts = mixedNumberParts(value);
  const [whole, numerator, denominator] = labels ?? ["Whole number", "Numerator", "Denominator"];
  const input = (part: keyof typeof parts, name: string) => <Input aria-label={name}
    aria-invalid={invalid} value={parts[part]} type="text" inputMode="numeric"
    pattern={part === "whole" ? "-?[0-9]+" : "[0-9]+"} maxLength={part === "whole" ? 25 : 24}
    autoComplete="off" spellCheck={false} readOnly={readOnly} required
    onChange={event => {
      const entry = event.target.value.replace(/^−/, "-");
      if (!(part === "whole" ? /^-?\d*$/ : /^\d*$/).test(entry)) return;
      const next = { ...parts, [part]: entry };
      onChange(next.whole + " " + next.numerator + "/" + next.denominator);
    }} />;
  return <fieldset className={styles.mixed} aria-describedby={describedBy} disabled={disabled}>
    <legend>{label}</legend>
    <div className={styles.number}>
      {input("whole", whole)}
      <div className={styles.fraction}>
        {input("numerator", numerator)}
        {input("denominator", denominator)}
      </div>
    </div>
  </fieldset>;
}
