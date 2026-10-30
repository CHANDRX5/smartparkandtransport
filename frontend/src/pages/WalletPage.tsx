import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Banknote,
  CreditCard,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { walletApi } from '../services/api';
import { WalletInfo, WalletTransaction } from '../types';
import { useAuth } from '../context/AuthContext';

export const WalletPage: React.FC = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'topup' | 'withdraw'>('overview');
  const [filterType, setFilterType] = useState<string>('');
  const [topupAmount, setTopupAmount] = useState<string>('');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [payoutDest, setPayoutDest] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [walletData, txData] = await Promise.allSettled([
        walletApi.getWallet(),
        walletApi.getTransactions(undefined, undefined, 100),
      ]);
      if (walletData.status === 'fulfilled') setWallet(walletData.value);
      if (txData.status === 'fulfilled') setTransactions(txData.value as WalletTransaction[]);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0 || amount > 100000) {
      setMessage({ type: 'error', text: 'Enter a valid amount between ₹1 and ₹1,00,000.' });
      return;
    }
    setTxLoading(true);
    setMessage(null);
    try {
      await walletApi.topup(amount, 'demo_sandbox');
      setMessage({ type: 'success', text: `₹${amount.toFixed(2)} credited to your wallet via Sandbox Gateway.` });
      setTopupAmount('');
      await loadWalletData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Top-up failed. Please try again.' });
    } finally {
      setTxLoading(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || amount > 50000) {
      setMessage({ type: 'error', text: 'Enter a valid withdrawal amount between ₹1 and ₹50,000.' });
      return;
    }
    if (!payoutDest || payoutDest.length < 5) {
      setMessage({ type: 'error', text: 'Enter a verified UPI ID (e.g. user@okhdfcbank) or Bank Account details.' });
      return;
    }
    setTxLoading(true);
    setMessage(null);
    try {
      await walletApi.withdraw({ amount, payout_destination: payoutDest });
      setMessage({ type: 'success', text: `Withdrawal of ₹${amount.toFixed(2)} initiated to ${payoutDest}.` });
      setWithdrawAmount('');
      setPayoutDest('');
      await loadWalletData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Withdrawal failed.' });
    } finally {
      setTxLoading(false);
    }
  };

  const filteredTx = filterType
    ? transactions.filter((t) => t.transaction_type === filterType)
    : transactions;

  const quickAmounts = [100, 500, 1000, 2000, 5000];

  const txIcon = (type: string) => {
    switch (type) {
      case 'CREDIT': return <ArrowDownCircle className="w-4 h-4 text-emerald-600" />;
      case 'DEBIT': return <ArrowUpCircle className="w-4 h-4 text-red-500" />;
      case 'WITHDRAWAL': return <Banknote className="w-4 h-4 text-amber-600" />;
      case 'REFUND': return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case 'REVERSAL': return <RefreshCw className="w-4 h-4 text-purple-600" />;
      default: return <CreditCard className="w-4 h-4 text-slate-500" />;
    }
  };

  const txColor = (type: string) => {
    return type === 'CREDIT' || type === 'REFUND' ? 'text-emerald-600' : 'text-red-600';
  };

  const txSign = (type: string) => {
    return type === 'CREDIT' || type === 'REFUND' || type === 'REVERSAL' ? '+' : '-';
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      SUCCESS: 'bg-emerald-100 text-emerald-800',
      PENDING: 'bg-amber-100 text-amber-800',
      FAILED: 'bg-red-100 text-red-800',
      REVERSED: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <Wallet className="w-8 h-8 text-brand-600 animate-pulse mx-auto" />
          <p className="text-xs text-slate-500">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-brand-600" />
          Digital Wallet
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Secure wallet for parking bookings, bus tickets, and authorized transactions.
        </p>
      </div>

      {/* Balance Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-navy-950 via-navy-900 to-brand-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Available Balance</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold mt-2 tracking-tight">
            ₹{wallet?.balance?.toFixed(2) || '0.00'}
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            Currency: {wallet?.currency || 'INR'} • Wallet ID: #{wallet?.id || '—'}
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <button
              onClick={() => { setActiveTab('topup'); setMessage(null); }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <TrendingUp className="w-4 h-4" /> Add Money
            </button>
            <button
              onClick={() => { setActiveTab('withdraw'); setMessage(null); }}
              className="px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-750 border border-slate-700 text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <TrendingDown className="w-4 h-4" /> Withdraw
            </button>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
      </div>

      {/* Demo Notice */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
        <AlertCircle className="w-4 h-4 text-brand-600 shrink-0" />
        <span>Sandbox Mode: Top-ups are processed via demo payment gateway. No real money is charged.</span>
      </div>

      {/* Message Banner */}
      {message && (
        <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Top-Up Form */}
      {activeTab === 'topup' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Add Money to Wallet
          </h3>
          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setTopupAmount(String(amt))}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  topupAmount === String(amt)
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                ₹{amt}
              </button>
            ))}
          </div>
          <form onSubmit={handleTopup} className="flex flex-col sm:flex-row gap-3">
            <input
              type="number"
              min="1"
              max="100000"
              step="0.01"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="Enter custom amount"
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={txLoading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              {txLoading ? 'Processing...' : 'Credit Wallet'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Withdraw Form */}
      {activeTab === 'withdraw' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-600" /> Withdraw Funds
          </h3>
          <form onSubmit={handleWithdraw} className="space-y-3">
            <input
              type="number"
              min="1"
              max="50000"
              step="0.01"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Withdrawal amount (₹)"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
            <input
              type="text"
              value={payoutDest}
              onChange={(e) => setPayoutDest(e.target.value)}
              placeholder="Payout destination (e.g. user@okhdfcbank or A/C + IFSC)"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={txLoading}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all"
            >
              {txLoading ? 'Processing...' : 'Initiate Withdrawal'}
            </button>
          </form>
        </div>
      )}

      {/* Transaction History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-navy-950 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-600" />
            Transaction History
          </h3>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All Types</option>
              <option value="CREDIT">Credits</option>
              <option value="DEBIT">Debits</option>
              <option value="WITHDRAWAL">Withdrawals</option>
              <option value="REFUND">Refunds</option>
              <option value="REVERSAL">Reversals</option>
            </select>
          </div>
        </div>

        {filteredTx.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
            <Wallet className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-500">No transactions yet. Add money to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {filteredTx.map((tx) => (
              <div key={tx.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    {txIcon(tx.transaction_type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy-950 truncate">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-mono">{tx.transaction_ref}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${statusBadge(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>
                    {tx.created_at && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                </div>
                <div className={`text-sm font-extrabold shrink-0 ${txColor(tx.transaction_type)}`}>
                  {txSign(tx.transaction_type)}₹{tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
