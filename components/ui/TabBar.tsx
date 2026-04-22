"use client";

// ── TabBar · ChevApp Design System ────────────────────────────────────────────
// Segmented control for mutually-exclusive choices — profile tabs, filter
// categories, view switchers ("Ocjene" / "Recenzije" / "Galerija").
//
// Implements the same 7shifts "Inactive Contrast Principle" as <Toggle>
// (DESIGN_SYSTEM.md §5):
//
//   selected    → vatra-tinted fill · vatra text · vatra border
//   unselected  → transparent fill · foreground text · muted border
//
// Inactive is NEVER a muted fill. If you find yourself wanting a gray
// background for the inactive state, stop — reach for borders and color
// instead.
//
// Layout: individual pill items with gaps between them (not a single
// pill-shaped container with inner segments). This lets the bar scroll
// horizontally on mobile without clipping weirdly, and each item has its
// own tappable target.
//
// ARIA: container has role="tablist", each item has role="tab" +
// aria-selected. Keyboard (arrow keys) is NOT wired up here — most uses
// are short lists where tabbing through is fine. If you need arrow-key
// traversal for a long tab list, wrap with a roving-tabindex helper.
//
// NOT the right component for:
//   - Binary on/off → use <Toggle>
//   - Multi-select chip groups → use a row of <Toggle>s
//   - Route-linked navigation → use a <nav> with styled <Link>s; this
//     is a stateful picker, not a menu
//
// Usage:
//   type ProfileTab = "ocjene" | "recenzije" | "galerija";
//   const [tab, setTab] = useState<ProfileTab>("ocjene");
//
//   <TabBar
//     value={tab}
//     onValueChange={setTab}
//     items={[
//       { value: "ocjene",    label: "Ocjene" },
//       { value: "recenzije", label: "Recenzije" },
//       { value: "galerija",  label: "Galerija" },
//     ]}
//   />
//
//   // With icons and counts:
//   <TabBar
//     value={tab}
//     onValueChange={setTab}
//     items={[
//       { value: "all",    label: "Sve",      icon: <List />,   count: 124 },
//       { value: "mine",   label: "Moje",     icon: <User />,   count: 12  },
//     ]}
//   />
// ────────────────────────────────────────────────────────────────────────────────

import { forwardRef } from "react";
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";

export type TabBarSize = "sm" | "md";

export interface TabBarItem<V extends string = string> {
  value: V;
  label: ReactNode;
  /** Optional Lucide icon rendered before the label. */
  icon?: ReactNode;
  /** Optional numeric badge rendered after the label (e.g. unread count). */
  count?: number;
  disabled?: boolean;
}

export interface TabBarProps<V extends string = string>
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: ReadonlyArray<TabBarItem<V>>;
  value: V;
  onValueChange: (value: V) => void;
  size?: TabBarSize;
  /** When true, fills parent width and items flex equally. Default false. */
  fullWidth?: boolean;
  /** Accessible name for the tablist (e.g. "Profil"). */
  "aria-label"?: string;
}

const SIZES: Record<TabBarSize, string> = {
  sm: "px-3  py-1   min-h-[32px] text-xs",
  md: "px-4  py-1.5 min-h-[40px] text-sm",
};

const STATE = {
  selected:
    "bg-primary/10 text-primary border-primary " +
    "hover:bg-primary/15",
  unselected:
    "bg-transparent text-foreground border-border " +
    "hover:border-primary/50 hover:text-primary hover:bg-primary/5",
};

// Generic forwardRef — have to cast because React's types don't preserve
// generics through forwardRef. The public type is restored via the `as`
// cast at the bottom.
const TabBarInner = forwardRef<HTMLDivElement, TabBarProps<string>>(
  (
    {
      items,
      value,
      onValueChange,
      size = "md",
      fullWidth = false,
      className,
      ...rest
    },
    ref,
  ) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        "inline-flex items-center gap-2",
        fullWidth && "w-full",
        // horizontal scroll when crowded — keeps mobile sane
        "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      {...rest}
    >
      {items.map((item) => {
        const isSelected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            disabled={item.disabled}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "inline-flex items-center justify-center gap-2 whitespace-nowrap",
              "font-sans font-semibold select-none",
              "rounded-pill border-[1.5px] transition-all duration-200",
              "active:scale-[0.97]",
              "disabled:opacity-40 disabled:pointer-events-none",
              "focus-visible:outline-none focus-visible:ring-2 " +
                "focus-visible:ring-primary/40 focus-visible:ring-offset-2 " +
                "focus-visible:ring-offset-background",
              SIZES[size],
              fullWidth && "flex-1",
              isSelected ? STATE.selected : STATE.unselected,
            )}
          >
            {item.icon}
            <span>{item.label}</span>
            {typeof item.count === "number" && (
              <span
                className={cn(
                  "inline-flex items-center justify-center",
                  "min-w-[20px] h-5 px-1.5 rounded-pill",
                  "text-[10px] font-semibold leading-none",
                  isSelected
                    ? "bg-primary text-primary-fg"
                    : "bg-border/60 text-muted",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  ),
);

TabBarInner.displayName = "TabBar";

// Re-export with the generic signature preserved.
export const TabBar = TabBarInner as <V extends string = string>(
  props: TabBarProps<V> & { ref?: Ref<HTMLDivElement> },
) => ReactElement;
