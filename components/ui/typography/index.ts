// ── Typography primitives · ChevApp Design System ─────────────────────────────
// Canonical type scale from DESIGN_SYSTEM.md §2.
//
//   <HeroTitle>    80px · Oswald 700 · UPPER    (hero)
//   <SectionTitle> 48px · Oswald 600 · UPPER    (section)
//   <CardTitle>    32px · Oswald 600            (card titles, min 28px)
//   <Subsection>   18px · Inter 600             (sub-headers)
//   <BodyText>     15px · Inter 400             (body copy)
//   <Label>        11px · Inter 600 · UPPER     (labels, badges, eyebrows)
//
// Barrel import:
//   import { HeroTitle, CardTitle, BodyText } from "@/components/ui/typography";
// ────────────────────────────────────────────────────────────────────────────────

export { HeroTitle }    from "./HeroTitle";
export { SectionTitle } from "./SectionTitle";
export { CardTitle }    from "./CardTitle";
export { Subsection }   from "./Subsection";
export { BodyText }     from "./BodyText";
export { Label }        from "./Label";

export type { HeroTitleProps }    from "./HeroTitle";
export type { SectionTitleProps } from "./SectionTitle";
export type { CardTitleProps }    from "./CardTitle";
export type { SubsectionProps }   from "./Subsection";
export type { BodyTextProps }     from "./BodyText";
export type { LabelProps }        from "./Label";
