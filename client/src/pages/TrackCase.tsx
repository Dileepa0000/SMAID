/**
 * ============================================================
 * SLAID / SMAID — Public Case Status Tracker (/track-case)
 * Public lookup by Ticket ID or Phone Number
 * ============================================================
 */

import React, { useState } from "react";
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Shield,
  MessageSquare,
  HelpCircle,
  ArrowRight,
  Loader2,
  FileText,
  DollarSign,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PayoutIssue {
  id: string;
  customerPhone: string;
  customerName?: string;
  transactionId?: string;
  amount?: string;
  currency?: string;
  issueCategory: string;
  status: "pending_approval" | "approved" | "rejected" | "resolved" | string;
  adminNotes?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function TrackCase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [issues, setIssues] = useState<PayoutIssue[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearched(true);
    setErrorMsg("");
    setIssues([]);

    try {
      const res = await fetch(`/api/payout-issues/track?q=${encodeURIComponent(searchQuery.trim())}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setIssues(json.data);
      } else {
        setErrorMsg(json.message || "No records found.");
      }
    } catch (err: any) {
      setErrorMsg("Failed to connect to tracking server.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_approval":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 gap-1 text-xs">
            <Clock className="w-3 h-3" /> Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 gap-1 text-xs">
            <Shield className="w-3 h-3" /> Approved / In Progress
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300 gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 gap-1 text-xs">
            <XCircle className="w-3 h-3" /> Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStepActive = (currentStatus: string, stepIndex: number) => {
    const statusOrder = ["pending_approval", "approved", "resolved"];
    if (currentStatus === "rejected") return false;
    const currentIndex = statusOrder.indexOf(currentStatus);
    return currentIndex >= stepIndex;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header / Brand Nav */}
      <header className="bg-white border-b border-slate-200 py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900 tracking-tight">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black">
              S
            </div>
            <span>SLAID <span className="text-blue-600 font-normal">Social Aid</span></span>
          </a>
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold bg-emerald-600 text-white px-3.5 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="bg-gradient-to-b from-blue-900 to-slate-900 text-white py-12 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 uppercase tracking-widest text-[10px]">
            Public Case Lookup
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Track Your Account Recovery Case Status
          </h1>
          <p className="text-sm text-slate-300">
            Enter your Ticket ID or registered Phone Number to check real-time progress.
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto mt-6">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Enter Ticket ID or Phone Number (+94...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white text-slate-900 rounded-lg text-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Track Case"}
            </Button>
          </form>
        </div>
      </section>

      {/* Results Section */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {searched && loading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Searching case records...</p>
          </div>
        )}

        {searched && !loading && issues.length === 0 && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center max-w-md mx-auto my-8">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No Case Found</h3>
            <p className="text-xs text-slate-600 mt-1 mb-4">
              We couldn't find any recovery case matching "<span className="font-semibold">{searchQuery}</span>".
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Please verify your Ticket ID or Phone Number and try again, or contact our support team on WhatsApp.
            </p>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Contact Support on WhatsApp
            </a>
          </div>
        )}

        {issues.map((issue) => (
          <div
            key={issue.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          >
            {/* Card Header */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Ticket ID: #{issue.id.slice(0, 8)}
                  </span>
                  {getStatusBadge(issue.status)}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1 capitalize">
                  {issue.issueCategory.replace("_", " ")} Recovery
                </h3>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Submitted {new Date(issue.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Progress Timeline */}
            <div className="p-6 border-b border-slate-100">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Case Progress Timeline
              </h4>
              <div className="grid grid-cols-3 gap-2 relative">
                {/* Step 1: Received */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      getStepActive(issue.status, 0)
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    1
                  </div>
                  <span className="text-xs font-medium text-slate-800 mt-2">Submitted</span>
                  <span className="text-[10px] text-slate-400">Case Intake</span>
                </div>

                {/* Step 2: Under Review */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      getStepActive(issue.status, 1)
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    2
                  </div>
                  <span className="text-xs font-medium text-slate-800 mt-2">In Progress</span>
                  <span className="text-[10px] text-slate-400">Staff Investigation</span>
                </div>

                {/* Step 3: Resolved */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      issue.status === "resolved"
                        ? "bg-emerald-600 text-white"
                        : issue.status === "rejected"
                        ? "bg-red-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    3
                  </div>
                  <span className="text-xs font-medium text-slate-800 mt-2">
                    {issue.status === "rejected" ? "Rejected" : "Resolved"}
                  </span>
                  <span className="text-[10px] text-slate-400">Final Outcome</span>
                </div>
              </div>
            </div>

            {/* Case Information Grid */}
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {issue.customerName && (
                <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                  <User className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="text-slate-500 font-medium">Customer Name</span>
                    <p className="font-semibold text-slate-900">{issue.customerName}</p>
                  </div>
                </div>
              )}

              {issue.transactionId && (
                <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="text-slate-500 font-medium">Transaction / Account Ref</span>
                    <p className="font-semibold text-slate-900">{issue.transactionId}</p>
                  </div>
                </div>
              )}

              {issue.amount && (
                <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                  <DollarSign className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="text-slate-500 font-medium">Claim Amount</span>
                    <p className="font-semibold text-slate-900">
                      {issue.amount} {issue.currency || "USD"}
                    </p>
                  </div>
                </div>
              )}

              {issue.adminNotes && (
                <div className="sm:col-span-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-blue-900 text-xs">Official Staff Update:</span>
                      <p className="text-blue-800 text-xs mt-0.5">{issue.adminNotes}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <p>© 2026 SLAID Social Aid. All rights reserved.</p>
      </footer>
    </div>
  );
}
