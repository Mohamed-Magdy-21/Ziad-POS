"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Product, useData } from "@/context/DataContext";

type CartItem = {
  productId: string;
  productCode: string;
  name: string;
  price: number;
  quantity: number;
};

const TAX_RATE = 0;

export default function PosPage() {
  const { products, adjustStock, recordSale, dataReady } = useData();
  const router = useRouter();

  const [codeInput, setCodeInput] = useState("");
  const [quantityInput, setQuantityInput] = useState("1");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = subtotal * TAX_RATE;
    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [cart]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.productCode.toLowerCase().includes(query)
    );
  }, [products, productSearch]);

  const addProductToCart = (product: Product, requestedQty: number) => {
    if (!Number.isInteger(requestedQty) || requestedQty <= 0) {
      setMessage("Quantity must be a whole number greater than 0.");
      return;
    }

    const alreadyInCart =
      cart.find((item) => item.productId === product.id)?.quantity ?? 0;
    const available = product.stockQuantity - alreadyInCart;
    if (requestedQty > available) {
      setMessage(
        `Out of Stock: Only ${available} units of ${product.name} remaining.`
      );
      return;
    }

    setCart((prev) => {
      const exists = prev.find((item) => item.productId === product.id);
      if (exists) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + requestedQty }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productCode: product.productCode,
          name: product.name,
          price: product.price,
          quantity: requestedQty,
        },
      ];
    });

    setMessage(`${product.name} added to cart.`);
  };

  if (!dataReady) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading POS...
      </div>
    );
  }

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const productCode = codeInput.trim();
    const requestedQty = Number(quantityInput);

    if (!productCode) {
      setMessage("Enter or scan a product code to proceed.");
      return;
    }
    if (!Number.isInteger(requestedQty) || requestedQty <= 0) {
      setMessage("Quantity must be a whole number greater than 0.");
      return;
    }

    const product = products.find(
      (item) => item.productCode.toLowerCase() === productCode.toLowerCase()
    );
    if (!product) {
      setMessage("Product not found. Double-check the code.");
      return;
    }

    addProductToCart(product, requestedQty);
    setCodeInput("");
    setQuantityInput("1");
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      return;
    }

    if (quantity > product.stockQuantity) {
      setMessage(
        `Out of Stock: Cannot set ${product.name} higher than available ${product.stockQuantity}.`
      );
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
    setMessage(null);
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const completeSale = () => {
    if (cart.length === 0) {
      setMessage("Add at least one item before completing the sale.");
      return;
    }

    const insufficient = cart.find((item) => {
      const product = products.find((prod) => prod.id === item.productId);
      return !product || item.quantity > product.stockQuantity;
    });
    if (insufficient) {
      setMessage(
        `Out of Stock: ${insufficient.name} exceeds available inventory.`
      );
      return;
    }

    cart.forEach((item) => adjustStock(item.productId, -item.quantity));
    const saleId = recordSale({
      soldItems: cart.map((item) => ({
        productId: item.productId,
        productCode: item.productCode,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: totals.subtotal,
      tax: totals.tax,
      totalAmount: totals.total,
    });

    setCart([]);
    setMessage("Sale completed successfully.");

    // Wait for state to be saved to localStorage before navigating
    // Use setTimeout to ensure React state updates and localStorage sync complete
    setTimeout(() => {
      router.push(`/invoice/${saleId}`);
    }, 100);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
      <section className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md hover:border-slate-300/80 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Point of Sale
          </h2>
          <p className="text-sm text-slate-500">
            Scan product codes or type them in manually.
          </p>
        </div>

        <form
          onSubmit={handleAdd}
          className="grid gap-4 md:grid-cols-[2fr,1fr,auto]"
        >
          <div className="relative">
            <input
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 pl-10"
              placeholder="Scan barcode or type code..."
              autoFocus
            />
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
          </div>
          <input
            type="number"
            min="1"
            step="1"
            value={quantityInput}
            onChange={(event) => setQuantityInput(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            placeholder="Qty"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-[0.98]"
          >
            Add Item
          </button>
        </form>

        {message && (
          <p
            className={`rounded-xl px-4 py-2 text-sm ${message.startsWith("Out of Stock")
              ? "bg-rose-50 text-rose-700"
              : "bg-emerald-50 text-emerald-700"
              }`}
          >
            {message}
          </p>
        )}

        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Available Products
              </p>
              <p className="text-xs text-slate-500">
                Click on any product card to add it to your cart.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search products..."
                className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
          <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-slate-100 bg-white p-4">
            {filteredProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No products match your search.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProductToCart(product, 1)}
                    disabled={product.stockQuantity === 0}
                    className={`group relative flex aspect-[4/3] flex-col items-start justify-between rounded-xl border p-4 text-left transition-all duration-200 ${product.stockQuantity === 0
                      ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                      : "cursor-pointer border-slate-200 bg-white shadow-sm hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md active:scale-95"
                      }`}
                  >
                    <div className="w-full">
                      <div className="mb-2 flex items-start justify-between">
                        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {product.productCode}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                    </div>
                    <div className="w-full flex items-end justify-between mt-2">
                      <p className="text-lg font-bold text-slate-900">
                        ${product.price.toFixed(2)}
                      </p>
                      <p
                        className={`text-xs font-medium px-2 py-1 rounded-full ${product.stockQuantity === 0
                          ? "bg-rose-100 text-rose-700"
                          : product.stockQuantity <= 5
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                          }`}
                      >
                        {product.stockQuantity} left
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-base">
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-left text-base font-semibold text-slate-500">
                  Item
                </th>
                <th className="px-3 py-2.5 text-left text-base font-semibold text-slate-500">
                  Code
                </th>
                <th className="px-3 py-2.5 text-left text-base font-semibold text-slate-500">
                  Qty
                </th>
                <th className="px-3 py-2.5 text-left text-base font-semibold text-slate-500">
                  Price
                </th>
                <th className="px-3 py-2.5 text-left text-base font-semibold text-slate-500">
                  Subtotal
                </th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cart.map((item) => (
                <tr key={item.productId}>
                  <td className="px-3 py-2.5 text-base font-semibold text-slate-800">
                    {item.name}
                  </td>
                  <td className="px-3 py-2.5 text-base text-slate-500">
                    {item.productCode}
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) =>
                        updateQuantity(
                          item.productId,
                          Number(event.target.value)
                        )
                      }
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-base focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-base text-slate-500">
                    ${item.price.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-base font-semibold text-slate-800">
                    ${(item.price * item.quantity).toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="text-base font-semibold text-rose-600 hover:text-rose-800"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-sm text-slate-500"
                  >
                    No items in cart. Scan a product to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md hover:border-slate-300/80 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Totals</h2>
          <p className="text-sm text-slate-500">
            Review subtotal, tax, and grand total before collecting payment.
          </p>
        </div>
        <dl className="space-y-4 text-base">
          <div className="flex items-center justify-between">
            <dt className="text-base text-slate-500">Subtotal</dt>
            <dd className="text-base text-slate-900 font-semibold">
              ${totals.subtotal.toFixed(2)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-base text-slate-500">
              Tax ({(TAX_RATE * 100).toFixed(0)}%)
            </dt>
            <dd className="text-base text-slate-900 font-semibold">
              ${totals.tax.toFixed(2)}
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-lg">
            <dt className="text-lg font-semibold text-slate-900">Grand Total</dt>
            <dd className="text-lg font-bold text-emerald-600">
              ${totals.total.toFixed(2)}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={completeSale}
          className="w-full inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:scale-[1.02] hover:shadow-indigo-500/30 active:scale-[0.98] py-4 text-base shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
          disabled={cart.length === 0}
        >
          Complete Sale &amp; Print Invoice
        </button>
        <p className="text-xs text-slate-400">
          Stock levels update automatically when the sale completes.
        </p>
      </section>
    </div>
  );
}
