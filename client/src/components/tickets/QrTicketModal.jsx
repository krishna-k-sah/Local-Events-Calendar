import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import {
  X,
  Download,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  User,
  Ticket,
  Copy,
  Check,
} from 'lucide-react';
import { ticketService } from '../../services/eventOperationsService';

export const QrTicketModal = ({ ticketCode, isOpen, onClose }) => {
  const [ticketData, setTicketData] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isOpen || !ticketCode) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    const fetchTicket = async () => {
      try {
        const res = await ticketService.getTicketDetails(ticketCode);
        if (!isMounted) return;
        setTicketData(res.data);

        // Generate QR code data URL using signed token (or raw code fallback)
        const payloadToEncode = res.data.signedToken || res.data.ticketCode;
        const url = await QRCode.toDataURL(payloadToEncode, {
          width: 280,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        if (isMounted) setQrDataUrl(url);
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load ticket details.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTicket();

    return () => {
      isMounted = false;
    };
  }, [isOpen, ticketCode]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (!ticketData) return;
    navigator.clipboard.writeText(ticketData.ticketCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = () => {
    if (!ticketData) return;
    setDownloading(true);

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5', // Compact event pass format
      });

      // Background styling
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 148, 210, 'F');

      // Top Header Banner
      doc.setFillColor(79, 70, 229); // brand-600
      doc.rect(0, 0, 148, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('EventHub • OFFICIAL EVENT PASS', 74, 13, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Verified Digital Ticket • Single Admission', 74, 19, { align: 'center' });

      // Ticket Card Container
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(10, 32, 128, 168, 4, 4, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(10, 32, 128, 168, 4, 4, 'D');

      // Event Title
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(ticketData.event.title, 116);
      doc.text(titleLines, 16, 44);

      let currentY = 44 + titleLines.length * 6;

      // Event Details
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);

      const eventDate = new Date(ticketData.event.startDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const eventTime = new Date(ticketData.event.startDate).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      doc.text(`Date & Time: ${eventDate} at ${eventTime}`, 16, currentY);
      currentY += 5;
      doc.text(`Venue: ${ticketData.event.venueName || 'Main Venue'}, ${ticketData.event.city}`, 16, currentY);
      currentY += 5;
      doc.text(`Category: ${ticketData.event.category || 'General'}`, 16, currentY);
      currentY += 8;

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.line(16, currentY, 132, currentY);
      currentY += 6;

      // Attendee Info
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`Attendee: ${ticketData.attendee.fullName}`, 16, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Email: ${ticketData.attendee.email}`, 16, currentY + 5);
      doc.text(`Ticket Code: ${ticketData.ticketCode}`, 16, currentY + 10);
      doc.text(`Status: ${ticketData.ticketStatus}`, 16, currentY + 15);

      currentY += 20;

      // Embed QR code image
      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', 44, currentY, 60, 60);
        currentY += 64;
      }

      // Security footer
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text('Scan this QR code at the event entrance for fast-track admission.', 74, currentY, { align: 'center' });
      doc.text('Cryptographically signed by EventHub. Duplication is strictly prohibited.', 74, currentY + 4, { align: 'center' });

      doc.save(`Ticket-${ticketData.ticketCode}.pdf`);
    } catch (pdfErr) {
      console.error('PDF export error:', pdfErr);
    } finally {
      setDownloading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VALID':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" /> Valid & Ready
          </span>
        );
      case 'USED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Checked In / Used
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Expired
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-brand-600 to-indigo-700 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Digital Event Pass</h3>
              <p className="text-xs text-white/80">Present this QR code at the door</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-500">Generating secure ticket payload...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : ticketData ? (
            <div className="space-y-5">
              {/* Event Card Info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">
                    {ticketData.event.title}
                  </h4>
                  {getStatusBadge(ticketData.ticketStatus)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-brand-500 shrink-0" />
                    <span>
                      {new Date(ticketData.event.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-500 shrink-0" />
                    <span>
                      {new Date(ticketData.event.startDate).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 col-span-full">
                    <MapPin className="w-4 h-4 text-brand-500 shrink-0" />
                    <span className="truncate">
                      {ticketData.event.venueName || 'Main Venue'}, {ticketData.event.city}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code Presentation */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-inner">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for Ticket ${ticketData.ticketCode}`}
                    className="w-52 h-52 rounded-xl object-contain shadow-sm"
                  />
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-mono font-bold tracking-wider text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                    {ticketData.ticketCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Copy Ticket Code"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 text-center">
                  Signed HMAC token • Fast door verification
                </p>
              </div>

              {/* Attendee Details */}
              <div className="flex items-center justify-between text-xs px-2 text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-900">{ticketData.attendee.fullName}</span>
                </div>
                <div className="text-slate-400 font-mono text-[11px]">
                  Booked: {new Date(ticketData.registeredAt).toLocaleDateString()}
                </div>
              </div>

              {/* Check-in info if already scanned */}
              {ticketData.attendance && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Admitted at {new Date(ticketData.attendance.scannedAt).toLocaleTimeString()} via {ticketData.attendance.method}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-xs hover:bg-brand-700 active:scale-[0.98] transition shadow-md shadow-brand-500/20 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? 'Exporting PDF...' : 'Download Official PDF Pass'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

