import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Car,
  CreditCard,
  ChevronRight,
  Inbox
} from 'lucide-react';
import { predictionApi } from '../services/api';
import { NotificationItem } from '../types';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await predictionApi.getNotifications();
      setNotifications(data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await predictionApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
          <Bell className="w-6 h-6 text-brand-600" />
          Notification Center
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time updates on parking spot reservations, payment receipts, and vehicle recovery sightings.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
            <p>No notifications in your inbox.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-5 transition-colors flex items-start justify-between gap-4 ${
                !notif.is_read ? 'bg-blue-50/40' : 'hover:bg-slate-50'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-navy-950">{notif.title}</span>
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-brand-600" />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                <span className="text-[10px] text-slate-400 block pt-1">
                  {new Date(notif.created_at).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {notif.link_url && (
                  <Link
                    to={notif.link_url}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    View
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                )}

                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="text-xs text-brand-600 hover:underline font-semibold"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
