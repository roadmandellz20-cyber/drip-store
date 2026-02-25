import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="text-lg font-semibold">DRIPSTORE</div>
          <p className="mt-3 text-sm text-neutral-600">
            Clean pieces. Loud presence. Built for daily wear.
          </p>
        </div>
        <div className="text-sm">
          <div className="font-medium">Shop</div>
          <div className="mt-3 flex flex-col gap-2 text-neutral-600">
            <Link href="/store?c=new">New</Link>
            <Link href="/store?c=men">Men</Link>
            <Link href="/store?c=women">Women</Link>
            <Link href="/store?c=accessories">Accessories</Link>
          </div>
        </div>
        <div className="text-sm">
          <div className="font-medium">Support</div>
          <div className="mt-3 flex flex-col gap-2 text-neutral-600">
            <Link href="/store">Store</Link>
            <Link href="/checkout">Checkout</Link>
          </div>
        </div>
        <div className="text-sm">
          <div className="font-medium">Newsletter</div>
          <p className="mt-3 text-neutral-600">Get drops first. No spam.</p>
          <form className="mt-3 flex gap-2">
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              placeholder="Email"
            />
            <button className="rounded-xl bg-black px-3 py-2 text-sm text-white">
              Join
            </button>
          </form>
        </div>
      </div>
      <div className="border-t py-6 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} DRIPSTORE
      </div>
    </footer>
  );
}
