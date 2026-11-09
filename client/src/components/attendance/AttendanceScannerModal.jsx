import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Scan,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Users,
  Search,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { attendanceService } from '../../services/eventOperationsService';

export const AttendanceScannerModal = ({ eventId, eventTitle, isOpen, onClose }) => {
  const [ticketInput, setTicketInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [stats, setStats] = useState({ totalRegistered: 0, totalAttended: 0, attendanceRate: 0 });
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'roster'
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !eventId) return;

    fetchAttendanceStats();
    if (inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, eventId]);

  const fetchAttendanceStats = async () => {
    try {
      setRosterLoading(true);
      const res = await attendanceService.getEventAttendance(eventId);
      setStats({
        totalRegistered: res.data.totalRegistered,
        totalAttended: res.data.totalAttended,
        attendanceRate: res.data.attendanceRate,
      });
      setRoster(res.data.roster || []);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setRosterLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const code = ticketInput.trim();
    if (!code) return;

    setLoading(true);
    setScanResult(null);

    try {
      const res = await attendanceService.scanTicket({
        ticketCodeOrToken: code,
        eventId,
        method: code.split('.').length === 3 ? 'QR' : 'MANUAL',
      });

      const successData = {
        type: 'SUCCESS',
        attendee: res.data.attendee,
        ticketCode: res.data.ticketCode,
        scannedAt: res.data.scannedAt,
        message: res.message,
      };

      setScanResult(successData);
      setRecentScans((prev) => [successData, ...prev.slice(0, 9)]);
      setTicketInput('');
      fetchAttendanceStats();
    } catch (err) {
      const errData = err.response?.data;
      if (err.response?.status === 409 && errData?.duplicate) {
        setScanResult({
          type: 'DUPLICATE',
          message: errData.message,
          data: errData.data,
        });
      } else {
        setScanResult({
          type: 'ERROR',
          message: errData?.message || 'Invalid or unrecognizable ticket.',
        });
      }
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleExportCsv = () => {
    window.open(attendanceService.getExportCsvUrl(eventId), '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-600 rounded-xl text-white">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Attendance Check-in Scanner</h3>
              <p className="text-xs text-slate-400 truncate max-w-md">{eventTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close scanner modal"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Bar */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <Users className="w-4 h-4 text-brand-600" />
              <span>
                Admitted: <strong className="text-slate-900">{stats.totalAttended}</strong> / {stats.totalRegistered}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="font-medium text-slate-700">
              Check-in Rate: <strong className="text-brand-600">{stats.attendanceRate}%</strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('scan')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeTab === 'scan' ? 'bg-brand-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-100'
              }`}
            >
              Scanner
            </button>
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeTab === 'roster' ? 'bg-brand-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-100'
              }`}
            >
              Roster ({roster.length})
            </button>
            <button
              onClick={handleExportCsv}
              className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition"
              title="Export Attendance CSV"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {activeTab === 'scan' ? (
            <div className="space-y-6">
              {/* Scan / Manual Entry Form */}
              <form onSubmit={handleScanSubmit} className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Scan QR Code or Enter Pass Token
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="e.g. EVT-ABCD-1234 or paste signed QR token"
                      value={ticketInput}
                      onChange={(e) => setTicketInput(e.target.value)}
                      disabled={loading}
                      className="w-full pl-3.5 pr-10 py-3 rounded-xl border border-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <Camera className="w-4 h-4" />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !ticketInput.trim()}
                    className="px-6 py-3 bg-brand-600 text-white font-semibold text-sm rounded-xl hover:bg-brand-700 active:scale-95 transition disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Check-In'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Hardware barcode scanner compatible. Scans automatically on Enter.
                </p>
              </form>

              {/* Feedback Alert Cards */}
              {scanResult && (
                <div className="animate-in fade-in duration-200">
                  {scanResult.type === 'SUCCESS' && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm text-emerald-900">Check-in Confirmed!</h4>
                        <p className="text-xs text-emerald-700 mt-0.5">{scanResult.message}</p>
                        <div className="mt-2 text-xs font-medium text-emerald-800 flex items-center gap-3">
                          <span>
                            Attendee: <strong>{scanResult.attendee?.fullName}</strong>
                          </span>
                          <span>•</span>
                          <span>Pass: {scanResult.ticketCode}</span>
                          <span>•</span>
                          <span>{new Date(scanResult.scannedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {scanResult.type === 'DUPLICATE' && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
                      <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm text-amber-900 flex items-center gap-2">
                          <span>DUPLICATE SCAN DETECTED</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                            WARNING
                          </span>
                        </h4>
                        <p className="text-xs text-amber-800 mt-1">{scanResult.message}</p>
                        {scanResult.data?.attendee && (
                          <div className="mt-2 text-xs text-amber-900 font-medium">
                            Attendee: <strong>{scanResult.data.attendee.fullName}</strong> ({scanResult.data.attendee.email})
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {scanResult.type === 'ERROR' && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
                      <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm text-rose-900">Scan Rejected</h4>
                        <p className="text-xs text-rose-700 mt-0.5">{scanResult.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Recent Scan History */}
              {recentScans.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Recent Door Check-ins
                  </h4>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
                    {recentScans.map((s, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="font-semibold text-slate-800">{s.attendee?.fullName}</span>
                          <span className="font-mono text-slate-400 text-[11px]">{s.ticketCode}</span>
                        </div>
                        <span className="text-slate-500 text-[11px]">
                          {new Date(s.scannedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Live Roster Tab */
            <div className="space-y-4">
              {rosterLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading attendee roster...</div>
              ) : roster.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No registered attendees yet.</div>
              ) : (
                <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {roster.map((item) => (
                    <div key={item.registrationId} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <div className="font-semibold text-slate-900">{item.attendee?.fullName}</div>
                        <div className="text-slate-500 text-[11px]">{item.attendee?.email} • {item.ticketCode}</div>
                      </div>
                      <div>
                        {item.isCheckedIn ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Checked In
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Awaiting Arrival
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

