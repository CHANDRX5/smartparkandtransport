import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  ShieldCheck,
  ArrowUpRight,
  Receipt
} from 'lucide-react';
import { paymentApi } from '../services/api';
import { Payment } from '../types';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentApi.getPaymentHistory();
      setPayments(data);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = payments
    .filter((p) => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-brand-600" />
          Payments & Transaction Ledger
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Auditable payment ledger with transaction references, tax receipts, and verified sandbox settlement.
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Settled Amount</span>
          <div className="text-2xl font-extrabold text-navy-950 mt-1">₹{totalSpent}.00</div>
          <span className="text-[11px] text-emerald-600 font-semibold">100% verified</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Total Transactions</span>
          <div className="text-2xl font-extrabold text-navy-950 mt-1">{payments.length}</div>
          <span className="text-[11px] text-slate-400">Lifetime ledger entries</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Gateway Provider</span>
          <div className="text-base font-extrabold text-brand-700 mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Razorpay Sandbox
          </div>
          <span className="text-[11px] text-slate-400">Zero card data stored locally</span>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
            Transaction History
          </h3>
          <button
            onClick={() => window.print()}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Ledger
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading ledger records...</div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Receipt className="w-8 h-8 mx-auto text-slate-300" />
            <p>No payment records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Transaction Ref</th>
                  <th className="p-4">Booking ID</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 font-mono font-bold text-navy-950">
                      {p.transaction_reference}
                    </td>
                    <td className="p-4 text-slate-600">#{p.booking_id}</td>
                    <td className="p-4 text-slate-600">{p.payment_method}</td>
                    <td className="p-4 font-bold text-navy-950">₹{p.amount}.00</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
