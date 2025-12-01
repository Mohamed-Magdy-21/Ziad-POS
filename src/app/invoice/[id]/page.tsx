import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import PrintOnLoad from "../PrintOnLoad";
import type { Metadata } from "next";

type Props = {
  params: {
    id: string;
  };
};

export const metadata: Metadata = {
  title: "Invoice",
};

async function getSale(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      soldItems: true,
    },
  });
  return sale;
}

export default async function InvoicePage({ params }: Props) {
  // `params` can be a Promise in some Next.js setups; await if needed
  const resolvedParams = (params && typeof (params as any).then === "function") ? await (params as any) : params;
  const { id } = resolvedParams as { id: string };
  const sale = await getSale(id);

  if (!sale) {
    return (
      <div className="card-surface text-center">
        <h2 className="text-lg font-semibold text-slate-900">Invoice not found</h2>
        <p className="mt-2 text-sm text-slate-500">
          The sale you are looking for could not be located. This may be a timing issue - please try refreshing the page.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <a
            href={`/invoice/${sale.id}`}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Refresh Page
          </a>
          <Link
            href="/pos"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Return to POS
          </Link>
        </div>
      </div>
    );
  }

  if (!sale.soldItems || sale.soldItems.length === 0) {
    return (
      <div className="card-surface text-center">
        <h2 className="text-lg font-semibold text-slate-900">Invoice Error</h2>
        <p className="mt-2 text-sm text-slate-500">This invoice has no items. Please contact support if this persists.</p>
        <Link
          href="/pos"
          className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Return to POS
        </Link>
      </div>
    );
  }

  const readableDate = sale.date ? new Date(sale.date).toLocaleString() : new Date().toLocaleString();
  const invoiceNumber = sale.id && sale.id.length >= 6 ? sale.id.slice(-6).toUpperCase() : sale.id?.toUpperCase() || "INVOICE";
  const subtotal = typeof sale.subtotal === "number" ? sale.subtotal : 0;
  const tax = typeof sale.tax === "number" ? sale.tax : 0;
  const totalAmount = typeof sale.totalAmount === "number" ? sale.totalAmount : subtotal + tax;

  return (
    <div className="space-y-6 flex flex-col items-center">
      <div className="thermal-receipt thermal-receipt-screen w-full max-w-[315px] bg-white p-4 shadow-md rounded-lg border border-slate-200 print:w-full print:max-w-full print:border-none print:bg-transparent print:shadow-none print:block print:single-page-invoice print:p-0">
        <div className="thermal-header text-center mb-2 print:mb-2 print:no-break">
          <div className="flex justify-center mb-2 print:mb-2">
            <Image src="/logo.png" alt="Company Logo" width={80} height={80} className="h-16 w-16 object-contain print:h-auto print:w-full print:max-w-[50mm] print:mx-auto" priority />
          </div>

          <div className="space-y-0.5 print:space-y-0.5">
            <h1 className="text-xl font-bold text-slate-900 print:text-sm">SwiftPOS</h1>
            <p className="text-xs font-medium text-slate-500 print:text-[10px]">Invoice #{invoiceNumber}</p>
            <p className="text-[10px] text-slate-400 print:text-[9px]">{readableDate}</p>
          </div>
        </div>

        <section className="mt-2 print:mt-2 print:no-break">
          <table className="w-full border-collapse text-xs print:text-[10px]">
            <thead>
              <tr className="border-b border-slate-300 print:border-black">
                <th className="py-1 text-left font-bold text-slate-900 print:text-[10px]">Code</th>
                <th className="py-1 text-left font-bold text-slate-900 print:text-[10px]">Item</th>
                <th className="py-1 text-center font-bold text-slate-900 print:text-[10px]">Qty</th>
                <th className="py-1 text-right font-bold text-slate-900 print:text-[10px]">Price</th>
                <th className="py-1 text-right font-bold text-slate-900 print:text-[10px]">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
              {sale.soldItems.map((item) => (
                <tr key={item.id}>
                  <td className="py-1 text-left font-mono text-[10px] text-slate-500 print:text-[9px]">{item.productCode}</td>
                  <td className="py-1 text-left font-medium text-slate-900 print:text-[10px]">{item.name}</td>
                  <td className="py-1 text-center text-slate-600 print:text-[10px]">{item.quantity}</td>
                  <td className="py-1 text-right text-slate-600 print:text-[10px]">${item.price.toFixed(2)}</td>
                  <td className="py-1 text-right font-semibold text-slate-900 print:text-[10px]">${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-4 border-t border-slate-300 pt-2 print:mt-2 print:border-black print:pt-1 print:no-break">
          <div className="space-y-1">
            <div className="flex justify-between text-xs print:text-[10px]"><span className="text-slate-600">Subtotal</span><span className="font-semibold text-slate-900">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-xs print:text-[10px]"><span className="text-slate-600">Tax</span><span className="font-semibold text-slate-900">${tax.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm font-bold text-slate-900 mt-2 pt-2 border-t border-slate-200 print:text-[12px] print:mt-1 print:pt-1 print:border-black"><span>Grand Total</span><span>${totalAmount.toFixed(2)}</span></div>
          </div>
        </section>

        <div className="mt-6 text-center print:mt-4 print:no-break"><p className="text-xs font-medium text-slate-900 print:text-[10px]">Thank you for your purchase!</p></div>
      </div>

      {/* Auto-print helper (client component) */}
      <PrintOnLoad />
      <div className="flex gap-4 mt-4 print:hidden">
        <Link href="/pos" className="flex-1 flex items-center justify-center rounded-lg border border-slate-300 bg-white px-8 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all hover:shadow-md">Back to POS</Link>
      </div>
    </div>
  );
}
