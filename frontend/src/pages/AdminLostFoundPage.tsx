import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Sparkles,
  MapPin,
  Clock,
  Car,
  Filter
} from 'lucide-react';
import { lostFoundApi } from '../services/api';
import { LostVehicleReport, FoundVehicleReport, SuggestedMatch } from '../types';

export const AdminLostFoundPage: React.FC = () => {
  const [lostReports, setLostReports] = useState<LostVehicleReport[]>([]);
  const [foundReports, setFoundReports] = useState<FoundVehicleReport[]>([]);
  const [matches, setMatches] = useState<SuggestedMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [lost, found] = await Promise.all([
        lostFoundApi.getLostReports(),
        lostFoundApi.getFoundReports(),
      ]);
      setLostReports(lost);
      setFoundReports(found);

      if (lost.length > 0) {
        const matchData = await lostFoundApi.getMatchesForLost(lost[0].id);
        setMatches(matchData);
      }
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmMatch = async (matchId: number) => {
    try {
      const updated = await lostFoundApi.reviewMatch(matchId, 'CONFIRMED');
      setMatches((prev) => prev.map((m) => (m.id === matchId ? updated : m)));
      alert('Match successfully confirmed! Recovery notifications sent to vehicle owner.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Action failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-amber-600" />
          Admin Lost & Found Recovery Moderation
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review vehicle recovery sightings, verify automated similarity scores, and authorize owner releases.
        </p>
      </div>

      {/* Suggested Matches Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-brand-600" />
            AI Algorithmic Match Correlations Awaiting Verification ({matches.length})
          </h3>
          <span className="text-xs text-slate-400">Rule-based scoring</span>
        </div>

        {matches.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No pending matches requiring review.</p>
        ) : (
          <div className="space-y-3">
            {matches.map((m) => (
              <div
                key={m.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                      Match Score: {m.match_score}%
                    </span>
                    <span className="text-xs font-mono font-bold text-navy-950">
                      Match ID: #{m.id}
                    </span>
                    <span className="text-[10px] text-slate-400">&bull; Status: {m.status}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                    {m.match_reasons}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleConfirmMatch(m.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Verify & Mark Resolved
                  </button>
                  <button
                    onClick={async () => {
                      await lostFoundApi.reviewMatch(m.id, 'REJECTED');
                      setMatches(matches.filter((x) => x.id !== m.id));
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reports Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lost Reports */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
              Submitted Lost Reports ({lostReports.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {lostReports.map((r) => (
              <div key={r.id} className="p-4 text-xs space-y-1 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <strong className="font-mono text-navy-950">{r.license_plate}</strong>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                    {r.status}
                  </span>
                </div>
                <div className="text-slate-600">
                  {r.color} {r.make} {r.model} &bull; Contact: {r.contact_name} ({r.contact_phone})
                </div>
                <div className="text-[11px] text-slate-400">{r.last_seen_location}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Found Reports */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold text-navy-950 uppercase tracking-wider">
              Submitted Found Sightings ({foundReports.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {foundReports.map((r) => (
              <div key={r.id} className="p-4 text-xs space-y-1 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <strong className="font-mono text-navy-950">
                    {r.license_plate || 'Unidentified'}
                  </strong>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {r.status}
                  </span>
                </div>
                <div className="text-slate-600">
                  {r.color} {r.make} {r.model} &bull; Reporter: {r.contact_name}
                </div>
                <div className="text-[11px] text-slate-400">{r.found_location}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
