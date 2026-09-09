import { formatPrice } from "@/lib/courses";

export default function DiscountedPrice({
  price,
  originalPrice,
  currency = "INR",
}: {
  price: number;
  originalPrice?: number | null;
  currency?: string;
}) {
  const hasDiscount = Boolean(originalPrice && originalPrice > price && price > 0);
  const discount = hasDiscount ? Math.round((1 - price / (originalPrice as number)) * 100) : 0;

  if (!hasDiscount) return <span>{formatPrice(price, currency)}</span>;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-400 line-through">{formatPrice(originalPrice as number, currency)}</span>
      <span>{formatPrice(price, currency)}</span>
      <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">{discount}% off</span>
    </span>
  );
}