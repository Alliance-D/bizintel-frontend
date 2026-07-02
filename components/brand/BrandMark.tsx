import Link from "next/link";
import { Building2 } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand-mark" aria-label="BizIntel home">
      <span className="brand-icon"><Building2 size={compact ? 18 : 21} /></span>
      <span className="brand-copy">
        <span className="brand-name">BizIntel</span>
        {!compact && <span className="brand-tagline">Business opportunity intelligence</span>}
      </span>
    </Link>
  );
}
