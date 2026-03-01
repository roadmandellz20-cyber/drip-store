import Link from "next/link";

export default function LegalLinks({
  className = "",
  itemClassName = "",
}: {
  className?: string;
  itemClassName?: string;
}) {
  const items = [
    { href: "/privacy", label: "PRIVACY POLICY" },
    { href: "/refunds", label: "REFUND POLICY" },
    { href: "/terms", label: "TERMS OF SERVICE" },
  ];

  return (
    <div className={className}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={itemClassName}>
          {item.label}
        </Link>
      ))}
    </div>
  );
}
