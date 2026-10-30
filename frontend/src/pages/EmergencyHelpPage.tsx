import React, { useState, useEffect } from 'react';
import {
  Phone,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Send,
  ChevronDown,
  ChevronUp,
  Siren,
  HeartPulse,
  Shield,
  Truck,
  Flame,
  Headphones,
  MessageSquare,
  Ticket,
  ExternalLink,
} from 'lucide-react';
import { emergencyApi } from '../services/api';
import { EmergencyContact, Complaint } from '../types';
import { useAuth } from '../context/AuthContext';

const COMPLAINT_CATEGORIES = [
  'Parking Gate Malfunction',
  'Payment Issue',
  'Bus Booking Issue',
  'Safety Concern',
  'Lost Item in Facility',
  'Staff Behavior',
  'App Bug or Error',
  'Refund Request',
  'Vehicle Damage',
  'Other',
];

const emergencyBadgeColor = (badge?: string) => {
  switch (badge) {
    case 'National SOS': return 'bg-red-100 text-red-800 border-red-200';
    case 'Medical': return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'Women SOS': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Highway SOS': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Fire Rescue': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Support': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
};

const emergencyIcon = (badge?: string) => {
  switch (badge) {
    case 'National SOS': return <Siren className="w-5 h-5 text-red-600" />;
    case 'Medical': return <HeartPulse className="w-5 h-5 text-rose-600" />;
    case 'Women SOS': return <Shield className="w-5 h-5 text-purple-600" />;
    case 'Highway SOS': return <Truck className="w-5 h-5 text-amber-600" />;
    case 'Fire Rescue': return <Flame className="w-5 h-5 text-orange-600" />;
    case 'Support': return <Headphones className="w-5 h-5 text-blue-600" />;
    default: return <Phone className="w-5 h-5 text-slate-600" />;
  }
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'OPEN': return 'bg-blue-100 text-blue-800';
    case 'IN_REVIEW': return 'bg-amber-100 text-amber-800';
    case 'RESOLVED': return 'bg-emerald-100 text-emerald-800';
    case 'CLOSED': return 'bg-slate-100 text-slate-600';
    default: return 'bg-slate-100 text-slate-600';
  }
};

export const EmergencyHelpPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'emergency' | 'report' | 'history'>('emergency');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Complaint form
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [linkedRef, setLinkedRef] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedComplaint, setExpandedComplaint] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contactsData, complaintsData] = await Promise.allSettled([
        emergencyApi.getContacts(),
        user ? emergencyApi.getMyComplaints() : Promise.resolve([]),
      ]);
      if (contactsData.status === 'fulfilled') setContacts(contactsData.value as EmergencyContact[]);
      if (complaintsData.status === 'fulfilled') setComplaints(complaintsData.value as Complaint[]);
    } catch { /* handled */ } finally { setLoading(false); }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !subject.trim() || !description.trim()) {
      setMessage({ type: 'error', text: 'Please fill in category, subject, and description.' });
      return;
    }
    setSubmitLoading(true);
    setMessage(null);
    try {
      const result = await emergencyApi.submitComplaint({
        category,
        subject: subject.trim(),
        description: description.trim(),
        linked_reference: linkedRef.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
      });
      setMessage({ type: 'success', text: `Issue reported successfully! Ticket: ${result.complaint_ref}. Our support team will review it shortly.` });
      setCategory(''); setSubject(''); setDescription(''); setLinkedRef(''); setContactEmail(''); setContactPhone('');
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to submit complaint.' });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse mx-auto" />
          <p className="text-xs text-slate-500">Loading emergency services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-red-600" />
          Emergency Help & Issue Reporting
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immediate emergency contacts, SmartPark helpdesk, and customer issue reporting with ticket tracking.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-200/80 rounded-xl w-fit">
        <button onClick={() => { setActiveTab('emergency'); setMessage(null); }}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'emergency' ? 'bg-white text-navy-950 shadow-xs' : 'text-slate-600'}`}>
          <Siren className="w-3.5 h-3.5" /> Emergency Contacts
        </button>
        <button onClick={() => { setActiveTab('report'); setMessage(null); }}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'report' ? 'bg-white text-navy-950 shadow-xs' : 'text-slate-600'}`}>
          <MessageSquare className="w-3.5 h-3.5" /> Report Issue
        </button>
        {user && (
          <button onClick={() => { setActiveTab('history'); setMessage(null); loadData(); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'history' ? 'bg-white text-navy-950 shadow-xs' : 'text-slate-600'}`}>
            <Ticket className="w-3.5 h-3.5" /> My Tickets ({complaints.length})
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* EMERGENCY CONTACTS */}
      {activeTab === 'emergency' && (
        <div className="space-y-4">
          {/* SOS Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xl">
            <div className="flex items-center gap-3">
              <Siren className="w-8 h-8 animate-pulse" />
              <div>
                <h2 className="text-base font-extrabold">In an emergency? Call 112 immediately.</h2>
                <p className="text-xs text-red-100 mt-0.5">India's unified emergency helpline connects you to police, ambulance, and fire rescue services instantly.</p>
              </div>
              <a href="tel:112" className="ml-auto px-5 py-3 rounded-xl bg-white text-red-600 font-extrabold text-sm shadow-lg hover:bg-red-50 transition-all shrink-0 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Call 112
              </a>
            </div>
          </div>

          {/* Contact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((contact, idx) => (
              <div key={idx} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all card-hover space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    {emergencyIcon(contact.badge)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-navy-950">{contact.service_name}</h3>
                      {contact.badge && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${emergencyBadgeColor(contact.badge)}`}>
                          {contact.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{contact.category}</p>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{contact.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-navy-950">{contact.number}</span>
                    {contact.is_toll_free && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">TOLL FREE</span>
                    )}
                  </div>
                  <a href={`tel:${contact.number.replace(/\s/g, '')}`}
                    className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Call Now
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPORT ISSUE */}
      {activeTab === 'report' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-600" />
            Submit a Support Ticket
          </h3>

          {!user ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
              <p className="text-xs text-slate-600">Please <a href="/login" className="text-brand-600 font-bold hover:underline">log in</a> to submit an issue report.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Category *</label>
                <select value={category} onChange={e => setCategory(e.target.value)} required
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white">
                  <option value="">Select a category...</option>
                  {COMPLAINT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)} required maxLength={200}
                  placeholder="Brief description of the issue"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4}
                  placeholder="Describe the issue in detail, including what happened, when, and where..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white resize-none" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Related Booking/Reference</label>
                  <input type="text" value={linkedRef} onChange={e => setLinkedRef(e.target.value)}
                    placeholder="e.g. BKG-20261030-ABC123"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                    placeholder="Your phone number"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 focus:bg-white" />
                </div>
              </div>

              <button type="submit" disabled={submitLoading}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50">
                {submitLoading ? 'Submitting...' : 'Submit Report'}
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      )}

      {/* TICKET HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-navy-950 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-brand-600" /> My Support Tickets
          </h3>

          {complaints.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500">You haven't submitted any support tickets.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map(c => (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedComplaint(expandedComplaint === c.id ? null : c.id)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-navy-950 font-mono">{c.complaint_ref}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusBadgeClass(c.status)}`}>{c.status}</span>
                        </div>
                        <p className="text-xs text-slate-600 truncate">{c.subject}</p>
                        <p className="text-[10px] text-slate-400">{c.category} • {c.created_at && new Date(c.created_at).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                    {expandedComplaint === c.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>

                  {expandedComplaint === c.id && (
                    <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-100">
                      <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed">{c.description}</div>
                      {c.linked_reference && <p className="text-[11px] text-slate-500">Related Reference: <strong>{c.linked_reference}</strong></p>}
                      {c.resolution_notes && (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                          <strong>Resolution Notes:</strong> {c.resolution_notes}
                        </div>
                      )}
                      {c.resolved_at && <p className="text-[10px] text-slate-400">Resolved: {new Date(c.resolved_at).toLocaleDateString('en-IN')}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
