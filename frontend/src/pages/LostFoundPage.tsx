import React, { useState, useEffect } from 'react';
import {
  Search,
  AlertTriangle,
  ShieldCheck,
  Car,
  MapPin,
  Calendar,
  Camera,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Lock,
  Phone,
  User,
  Info,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { lostFoundApi } from '../services/api';
import { LostVehicleReport, FoundVehicleReport, SuggestedMatch } from '../types';

export const LostFoundPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'feed' | 'report_lost' | 'report_found' | 'matches'>('feed');

  // Reports data
  const [lostReports, setLostReports] = useState<LostVehicleReport[]>([]);
  const [foundReports, setFoundReports] = useState<FoundVehicleReport[]>([]);
  const [matches, setMatches] = useState<SuggestedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter
  const [searchPlate, setSearchPlate] = useState('');

  // Lost Form State
  const [lostForm, setLostForm] = useState({
    license_plate: '',
    vehicle_type: 'car',
    make: '',
    model: '',
    color: '',
    last_seen_location: '',
    last_seen_latitude: 12.9716,
    last_seen_longitude: 77.5946,
    last_seen_datetime: new Date().toISOString().slice(0, 16),
    description: '',
    contact_name: user?.full_name || '',
    contact_phone: user?.phone || '',
    hide_contact_details: true,
  });

  // Found Form State
  const [foundForm, setFoundForm] = useState({
    license_plate: '',
    vehicle_type: 'car',
    make: '',
    model: '',
    color: '',
    found_location: '',
    found_latitude: 12.9716,
    found_longitude: 77.5946,
    found_datetime: new Date().toISOString().slice(0, 16),
    description: '',
    contact_name: user?.full_name || '',
    contact_phone: user?.phone || '',
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [lost, found] = await Promise.all([
        lostFoundApi.getLostReports(),
        lostFoundApi.getFoundReports(),
      ]);
      setLostReports(lost);
      setFoundReports(found);

      if (lost.length > 0) {
        // Fetch matches for the first report
        try {
          const matchData = await lostFoundApi.getMatchesForLost(lost[0].id);
          setMatches(matchData);
        } catch {
          // ignore
        }
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleReportLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const created = await lostFoundApi.reportLost({
        ...lostForm,
        license_plate: lostForm.license_plate.toUpperCase().trim(),
      });
      setLostReports([created, ...lostReports]);
      setFeedbackMsg({
        type: 'success',
        text: `Lost vehicle report submitted! Reference: ${created.report_reference}. The automated match engine is scanning sightings.`,
      });
      setActiveTab('feed');
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to submit report. Ensure inputs are valid.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportFoundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const created = await lostFoundApi.reportFound({
        ...foundForm,
        license_plate: foundForm.license_plate.toUpperCase().trim(),
      });
      setFoundReports([created, ...foundReports]);
      setFeedbackMsg({
        type: 'success',
        text: `Found vehicle sighting recorded! Reference: ${created.report_reference}. Potential owner will be notified if a match occurs.`,
      });
      setActiveTab('feed');
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to record found vehicle report.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewMatch = async (matchId: number, status: 'CONFIRMED' | 'REJECTED') => {
    try {
      const updated = await lostFoundApi.reviewMatch(matchId, status);
      setMatches((prev) => prev.map((m) => (m.id === matchId ? updated : m)));
      alert(`Match review recorded: ${status}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Review action failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          Lost & Found Vehicle Recovery Engine
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Two-sided recovery ecosystem combining community sightings with explainable rule-based AI similarity matching.
        </p>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-slate-100 rounded-2xl">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'feed'
                ? 'bg-white text-navy-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Reports ({lostReports.length + foundReports.length})
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'matches'
                ? 'bg-white text-navy-950 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            AI Match Correlations ({matches.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('report_lost')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'report_lost'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Report Lost Vehicle
          </button>
          <button
            onClick={() => setActiveTab('report_found')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'report_found'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Report Found Vehicle
          </button>
        </div>
      </div>

      {/* 1. All Reports Feed */}
      {activeTab === 'feed' && (
        <div className="space-y-6">
          {/* Quick Search Plate */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              placeholder="Search by license plate number (e.g. KA-05)..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lost Reports Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Active Lost Vehicle Reports ({lostReports.length})
              </h3>

              {lostReports
                .filter((r) =>
                  r.license_plate?.toLowerCase().includes(searchPlate.toLowerCase())
                )
                .map((r) => (
                  <div
                    key={r.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 card-hover"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                          {r.status}
                        </span>
                        <h4 className="text-sm font-bold text-navy-950 font-mono mt-1">
                          {r.license_plate}
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {r.report_reference}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      <strong>
                        {r.color} {r.make} {r.model}
                      </strong>{' '}
                      &bull; Type: <span className="capitalize">{r.vehicle_type}</span>
                    </p>

                    <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Last seen: {r.last_seen_location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Date: {new Date(r.last_seen_datetime).toLocaleString()}</span>
                      </div>
                    </div>

                    {r.description && (
                      <p className="text-xs text-slate-500 italic">"{r.description}"</p>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        Contact details protected
                      </span>
                      <button
                        onClick={async () => {
                          const res = await lostFoundApi.getMatchesForLost(r.id);
                          setMatches(res);
                          setActiveTab('matches');
                        }}
                        className="text-brand-600 font-bold hover:underline"
                      >
                        Inspect Matches &rarr;
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Found Reports Column */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Reported Found Vehicles / Sightings ({foundReports.length})
              </h3>

              {foundReports
                .filter(
                  (r) =>
                    !searchPlate ||
                    r.license_plate?.toLowerCase().includes(searchPlate.toLowerCase())
                )
                .map((r) => (
                  <div
                    key={r.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 card-hover"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {r.status}
                        </span>
                        <h4 className="text-sm font-bold text-navy-950 font-mono mt-1">
                          {r.license_plate || 'Unidentified Plate'}
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {r.report_reference}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">
                      <strong>
                        {r.color} {r.make} {r.model}
                      </strong>{' '}
                      &bull; Type: <span className="capitalize">{r.vehicle_type}</span>
                    </p>

                    <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Sighting: {r.found_location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Found at: {new Date(r.found_datetime).toLocaleString()}</span>
                      </div>
                    </div>

                    {r.description && (
                      <p className="text-xs text-slate-500 italic">"{r.description}"</p>
                    )}

                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                      Reporter: {r.contact_name} &bull; Stored in platform database
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. AI Matches Correlations */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-brand-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-brand-600 shrink-0" />
            <span>
              Matches are generated through deterministic Levenshtein distance on license plates, make/model similarity, color matching, and GPS radius proximity. Matches remain unverified until confirmed by an operator or owner.
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-navy-950">No High-Confidence Matches Yet</h4>
              <p className="text-[11px] text-slate-500">
                The match engine continuously checks new found-vehicle submissions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-extrabold text-sm">
                        {m.match_score}%
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-navy-950">
                          Potential Vehicle Sighting Correlation
                        </h4>
                        <span className="text-xs text-slate-400">
                          Match Engine ID: #{m.id} &bull; Status: {m.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReviewMatch(m.id, 'CONFIRMED')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm Match
                      </button>
                      <button
                        onClick={() => handleReviewMatch(m.id, 'REJECTED')}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                    <span className="font-semibold text-slate-500 block mb-1">
                      Algorithmic Explanation:
                    </span>
                    {m.match_reasons}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Report Lost Vehicle Form */}
      {activeTab === 'report_lost' && (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-navy-950 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Report a Lost or Stolen Vehicle
            </h2>
            <p className="text-xs text-slate-500">
              Provide vehicle details to trigger automated sighting matching across smart parking facilities.
            </p>
          </div>

          <form onSubmit={handleReportLostSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  License Plate Number *
                </label>
                <input
                  type="text"
                  required
                  value={lostForm.license_plate}
                  onChange={(e) => setLostForm({ ...lostForm, license_plate: e.target.value })}
                  placeholder="e.g. KA-05-AB-9876"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={lostForm.vehicle_type}
                  onChange={(e) => setLostForm({ ...lostForm, vehicle_type: e.target.value })}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="car">Car / Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="motorcycle">Motorcycle / Scooter</option>
                  <option value="truck">Commercial Truck</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Make *</label>
                <input
                  type="text"
                  required
                  value={lostForm.make}
                  onChange={(e) => setLostForm({ ...lostForm, make: e.target.value })}
                  placeholder="e.g. Honda"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Model *</label>
                <input
                  type="text"
                  required
                  value={lostForm.model}
                  onChange={(e) => setLostForm({ ...lostForm, model: e.target.value })}
                  placeholder="e.g. City"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Color *</label>
                <input
                  type="text"
                  required
                  value={lostForm.color}
                  onChange={(e) => setLostForm({ ...lostForm, color: e.target.value })}
                  placeholder="e.g. Silver"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Last Known Location *
              </label>
              <input
                type="text"
                required
                value={lostForm.last_seen_location}
                onChange={(e) => setLostForm({ ...lostForm, last_seen_location: e.target.value })}
                placeholder="Street address, mall parking, or landmark"
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Last Seen Date & Approximate Time *
              </label>
              <input
                type="datetime-local"
                required
                value={lostForm.last_seen_datetime}
                onChange={(e) => setLostForm({ ...lostForm, last_seen_datetime: e.target.value })}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Distinguishing Marks / Description
              </label>
              <textarea
                rows={3}
                value={lostForm.description}
                onChange={(e) => setLostForm({ ...lostForm, description: e.target.value })}
                placeholder="e.g. Scratch on bumper, custom roof rack, sticker on rear windshield"
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  required
                  value={lostForm.contact_name}
                  onChange={(e) => setLostForm({ ...lostForm, contact_name: e.target.value })}
                  placeholder="Your full name"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={lostForm.contact_phone}
                  onChange={(e) => setLostForm({ ...lostForm, contact_phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="hide_contact"
                checked={lostForm.hide_contact_details}
                onChange={(e) =>
                  setLostForm({ ...lostForm, hide_contact_details: e.target.checked })
                }
                className="rounded text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="hide_contact" className="text-xs text-slate-600 cursor-pointer">
                Keep contact phone hidden from public view (Recommended)
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-60"
            >
              {submitting ? 'Submitting Report...' : 'Broadcast Lost Vehicle Report'}
            </button>
          </form>
        </div>
      )}

      {/* 4. Report Found Vehicle Form */}
      {activeTab === 'report_found' && (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-navy-950 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Report a Sighting or Found Vehicle
            </h2>
            <p className="text-xs text-slate-500">
              Notice an unattended or abandoned vehicle? Submit details to help reunite owners.
            </p>
          </div>

          <form onSubmit={handleReportFoundSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  License Plate (If Visible)
                </label>
                <input
                  type="text"
                  value={foundForm.license_plate}
                  onChange={(e) => setFoundForm({ ...foundForm, license_plate: e.target.value })}
                  placeholder="e.g. KA-05-AB-9876"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={foundForm.vehicle_type}
                  onChange={(e) => setFoundForm({ ...foundForm, vehicle_type: e.target.value })}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="car">Car / Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="motorcycle">Motorcycle / Scooter</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Make *</label>
                <input
                  type="text"
                  required
                  value={foundForm.make}
                  onChange={(e) => setFoundForm({ ...foundForm, make: e.target.value })}
                  placeholder="e.g. Honda"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Model *</label>
                <input
                  type="text"
                  required
                  value={foundForm.model}
                  onChange={(e) => setFoundForm({ ...foundForm, model: e.target.value })}
                  placeholder="e.g. City"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Color *</label>
                <input
                  type="text"
                  required
                  value={foundForm.color}
                  onChange={(e) => setFoundForm({ ...foundForm, color: e.target.value })}
                  placeholder="e.g. Silver"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sighting Location Address *
              </label>
              <input
                type="text"
                required
                value={foundForm.found_location}
                onChange={(e) => setFoundForm({ ...foundForm, found_location: e.target.value })}
                placeholder="Parking bay, street or GPS area"
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date & Time Spotted *
              </label>
              <input
                type="datetime-local"
                required
                value={foundForm.found_datetime}
                onChange={(e) => setFoundForm({ ...foundForm, found_datetime: e.target.value })}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sighting Notes
              </label>
              <textarea
                rows={2}
                value={foundForm.description}
                onChange={(e) => setFoundForm({ ...foundForm, description: e.target.value })}
                placeholder="e.g. Parked unattended for over 48 hours without parking pass."
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-60"
            >
              {submitting ? 'Submitting Sighting...' : 'Log Found Vehicle Sighting'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
