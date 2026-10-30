import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Upload,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  Sliders,
  ShieldCheck,
  Check,
  History,
  FileCheck,
  Building2,
  Info
} from 'lucide-react';
import { aiDetectionApi, ownerApi, parkingApi } from '../services/api';
import { ParkingFacility } from '../types';
import { useAuth } from '../context/AuthContext';

interface DetectedSpace {
  space_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'apparently_occupied' | 'apparently_vacant' | 'uncertain';
  confidence: number;
}

interface AnalysisResult {
  analysis_id: number;
  image_name: string;
  image_url: string;
  facility_id?: number;
  total_detected_spaces: number;
  occupied_count: number;
  vacant_count: number;
  uncertain_count: number;
  confidence_score: number;
  uncertainty_rate: number;
  detected_spaces: DetectedSpace[];
  status: string;
  disclaimer: string;
}

export const ParkingAIDetectionPage: React.FC = () => {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | ''>('');
  const [gridRows, setGridRows] = useState<number>(3);
  const [gridCols, setGridCols] = useState<number>(6);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [selectedSpaceIndex, setSelectedSpaceIndex] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFacilities();
    loadHistory();
  }, []);

  const loadFacilities = async () => {
    try {
      if (user?.role === 'operator' || user?.role === 'admin') {
        const facs = await ownerApi.getMyFacilities();
        setFacilities(facs);
        if (facs.length > 0) setSelectedFacilityId(facs[0].id);
      } else {
        const facs = await parkingApi.getFacilities();
        setFacilities(facs);
      }
    } catch {
      // Ignore fallback
    }
  };

  const loadHistory = async () => {
    try {
      const hist = await aiDetectionApi.getAnalyses();
      setHistory(hist);
    } catch {
      // Ignore
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setCurrentResult(null);
      setActionMessage(null);
      setErrorMessage(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select or drag an aerial image first.');
      return;
    }

    setAnalyzing(true);
    setErrorMessage(null);
    setActionMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (selectedFacilityId) {
      formData.append('facility_id', String(selectedFacilityId));
    }
    formData.append('grid_rows', String(gridRows));
    formData.append('grid_cols', String(gridCols));

    try {
      const res = await aiDetectionApi.analyzeImage(formData);
      setCurrentResult(res);
      setActionMessage('AI aerial analysis complete! Review the detected bays below.');
      loadHistory();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || 'Analysis failed. Please check the image format.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Human correction: toggle status of a detected bay
  const handleToggleSpaceStatus = (index: number) => {
    if (!currentResult) return;
    const updated = [...currentResult.detected_spaces];
    const curr = updated[index];
    const nextStatus =
      curr.status === 'apparently_occupied'
        ? 'apparently_vacant'
        : curr.status === 'apparently_vacant'
        ? 'uncertain'
        : 'apparently_occupied';

    updated[index] = { ...curr, status: nextStatus };

    const occ = updated.filter((s) => s.status === 'apparently_occupied').length;
    const vac = updated.filter((s) => s.status === 'apparently_vacant').length;
    const unc = updated.filter((s) => s.status === 'uncertain').length;

    setCurrentResult({
      ...currentResult,
      detected_spaces: updated,
      occupied_count: occ,
      vacant_count: vac,
      uncertain_count: unc,
    });
  };

  const handleSaveReview = async () => {
    if (!currentResult) return;
    setSavingReview(true);
    setErrorMessage(null);

    try {
      await aiDetectionApi.reviewAnalysis(currentResult.analysis_id, {
        detected_spaces: currentResult.detected_spaces,
        review_notes: reviewNotes,
      });
      setActionMessage('Human corrections and review notes saved successfully.');
      loadHistory();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || 'Failed to save review.');
    } finally {
      setSavingReview(false);
    }
  };

  const handleApplyToFacility = async () => {
    if (!currentResult || !currentResult.facility_id) return;
    if (!window.confirm(`Apply verified count (${currentResult.vacant_count} vacant bays) to this facility's live database record?`)) {
      return;
    }

    setApplying(true);
    setErrorMessage(null);

    try {
      const res = await aiDetectionApi.applyAnalysis(currentResult.analysis_id);
      setActionMessage(res.message);
      setCurrentResult({ ...currentResult, status: 'applied' });
      loadHistory();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || 'Failed to apply analysis to facility.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-navy-950 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-brand-600" />
          AI Aerial Parking Space Detection
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Isolated computer-vision analysis for aerial & drone photography with confidence scoring and human operator review.
        </p>
      </div>

      {/* Strict Transparency Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold">Transparent AI Protocol</div>
          <p className="text-blue-800 leading-relaxed text-[11px]">
            This tool performs computer-vision pattern analysis on uploaded static aerial imagery. It does not claim continuous live satellite telemetry. Facility vacancy counters are never modified automatically without human verification and confirmation.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Step 1: Upload and Configuration Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
        <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
          <Upload className="w-4 h-4 text-brand-600" />
          Step 1: Upload Aerial / Drone Image & Set Parameters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Facility Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Associate Facility (Optional)
            </label>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
            >
              <option value="">-- Generic Area Analysis --</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.city})
                </option>
              ))}
            </select>
          </div>

          {/* Grid Rows */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estimated Parking Rows ({gridRows})
            </label>
            <input
              type="range"
              min={1}
              max={6}
              value={gridRows}
              onChange={(e) => setGridRows(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>

          {/* Grid Cols */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estimated Columns ({gridCols})
            </label>
            <input
              type="range"
              min={2}
              max={10}
              value={gridCols}
              onChange={(e) => setGridCols(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>
        </div>

        {/* Drag and Drop Upload Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center cursor-pointer hover:border-brand-400 hover:bg-slate-50 transition-all space-y-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-navy-950">
            {selectedFile ? selectedFile.name : 'Click or drag an aerial snapshot here'}
          </p>
          <p className="text-[11px] text-slate-400">
            Supported formats: PNG, JPG, WEBP &bull; Max size: 10MB
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!selectedFile || analyzing}
            className="py-2.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing Image Pattern Matrix...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Run AI Detection Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {/* Step 2: Visual Inspection & Human Correction */}
      {currentResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Visual Canvas / Image Overlay */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-600" />
                Interactive Visual Detection Overlay
              </h2>
              <span className="text-xs text-slate-400">
                Click any bounding box to toggle status
              </span>
            </div>

            {/* Image + SVG Overlay */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Aerial Analysis"
                  className="w-full h-auto max-h-[500px] object-cover block opacity-90"
                />
              )}

              {/* Interactive Bounding Box Grid */}
              <div className="absolute inset-0 p-4 grid gap-2"
                style={{
                  gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
                  gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`
                }}
              >
                {currentResult.detected_spaces.map((space, idx) => {
                  const isOcc = space.status === 'apparently_occupied';
                  const isVac = space.status === 'apparently_vacant';
                  const isUnc = space.status === 'uncertain';

                  return (
                    <button
                      key={space.space_id}
                      type="button"
                      onClick={() => handleToggleSpaceStatus(idx)}
                      title={`Slot: ${space.space_id} | Status: ${space.status} | Conf: ${(space.confidence * 100).toFixed(0)}% (Click to toggle)`}
                      className={`rounded-lg border-2 p-1.5 flex flex-col justify-between text-left transition-all hover:scale-105 active:scale-95 shadow-md ${
                        isVac
                          ? 'border-emerald-400 bg-emerald-500/30 text-white hover:bg-emerald-500/50'
                          : isOcc
                          ? 'border-red-400 bg-red-500/30 text-white hover:bg-red-500/50'
                          : 'border-amber-400 bg-amber-500/30 text-white hover:bg-amber-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold tracking-tight">
                          {space.space_id}
                        </span>
                        {isVac ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                        ) : isOcc ? (
                          <XCircle className="w-3 h-3 text-red-300" />
                        ) : (
                          <HelpCircle className="w-3 h-3 text-amber-300" />
                        )}
                      </div>
                      <div className="text-[9px] font-semibold mt-1">
                        {isVac ? 'Vacant' : isOcc ? 'Occupied' : 'Uncertain'} &bull; {(space.confidence * 100).toFixed(0)}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs pt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600" />
                <span className="text-slate-700 font-medium">Apparently Vacant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500 border border-red-600" />
                <span className="text-slate-700 font-medium">Apparently Occupied</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500 border border-amber-600" />
                <span className="text-slate-700 font-medium">Uncertain Pattern</span>
              </div>
            </div>
          </div>

          {/* Metrics & Human Review Controls */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-600" />
                Analysis Metrics
              </h3>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                  <div className="text-2xl font-extrabold text-navy-950">
                    {currentResult.total_detected_spaces}
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Bays</div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                  <div className="text-2xl font-extrabold">
                    {currentResult.vacant_count}
                  </div>
                  <div className="text-[10px] font-semibold uppercase">Vacant</div>
                </div>

                <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800">
                  <div className="text-2xl font-extrabold">
                    {currentResult.occupied_count}
                  </div>
                  <div className="text-[10px] font-semibold uppercase">Occupied</div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
                  <div className="text-2xl font-extrabold">
                    {currentResult.uncertain_count}
                  </div>
                  <div className="text-[10px] font-semibold uppercase">Uncertain</div>
                </div>
              </div>

              {/* Confidence Meter */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Model Confidence</span>
                  <span className="font-extrabold text-navy-950">
                    {(currentResult.confidence_score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${currentResult.confidence_score * 100}%` }}
                    className="h-full bg-brand-500 rounded-full"
                  />
                </div>
              </div>

              {/* Human Review Form */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">
                  Reviewer Notes & Verification
                </label>
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Ground shadow corrected on Bay 4; confirmed 11 vehicles present."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveReview}
                disabled={savingReview}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-navy-950 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {savingReview ? 'Saving Verification...' : 'Save Human Review'}
              </button>

              {/* Apply to Facility Button (Operator / Admin only) */}
              {currentResult.facility_id && (user?.role === 'operator' || user?.role === 'admin') && (
                <button
                  type="button"
                  onClick={handleApplyToFacility}
                  disabled={applying || currentResult.status === 'applied'}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Building2 className="w-4 h-4" />
                  {currentResult.status === 'applied'
                    ? 'Applied to Live Facility'
                    : applying
                    ? 'Updating Facility...'
                    : 'Apply Verified Count to Facility'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Past Aerial Analyses History */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-navy-950 flex items-center gap-2">
          <History className="w-4 h-4 text-brand-600" />
          Aerial Analysis Audit & History
        </h2>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400">No aerial analyses recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Image Name</th>
                  <th className="p-3">Detected Bays</th>
                  <th className="p-3">Confidence</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Review Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-navy-950">#{h.id}</td>
                    <td className="p-3 font-medium text-slate-700 truncate max-w-xs">
                      {h.image_name}
                    </td>
                    <td className="p-3">
                      <span className="text-emerald-700 font-bold">{h.vacant_count} vacant</span> / {h.total_detected}
                    </td>
                    <td className="p-3 font-semibold text-slate-600">
                      {(h.confidence_score * 100).toFixed(0)}%
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          h.status === 'applied'
                            ? 'bg-emerald-100 text-emerald-800'
                            : h.status === 'reviewed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">
                      {h.review_notes || 'Pending human review'}
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
