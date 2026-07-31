import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  MessageSquare,
  RefreshCw,
  Building2,
  CreditCard,
  UserCheck,
  ShieldCheck,
  Ban,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";

interface PayoutIssue {
  id: string;
  customerName: string | null;
  customerPhone: string;
  transactionId: string | null;
  amount: string | null;
  currency: string;
  issueCategory: string;
  status: "pending_approval" | "approved" | "rejected" | "resolved";
  failureReason: string | null;
  bankDetails: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    branch?: string;
  };
  adminNotes: string | null;
  createdAt: string;
}

export default function PayoutResolver() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIssue, setSelectedIssue] = useState<PayoutIssue | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "resolve" | null>(null);
  const [noteText, setNoteText] = useState("");
  const { toast } = useToast();

  const { data: issuesResponse, isLoading, refetch } = useQuery<{ success: boolean; data: PayoutIssue[] }>({
    queryKey: ["/api/payout-issues", statusFilter],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/payout-issues?status=${statusFilter}`);
      return res.json();
    },
  });

  const issues = issuesResponse?.data || [];

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest("POST", `/api/payout-issues/${id}/approve`, { notes });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payout Approved",
        description: "The payout retry request has been approved for reprocessing.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payout-issues"] });
      setSelectedIssue(null);
      setActionType(null);
      setNoteText("");
    },
    onError: (error: any) => {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to approve payout request.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/payout-issues/${id}/reject`, { reason });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Rejected",
        description: "The payout retry request has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payout-issues"] });
      setSelectedIssue(null);
      setActionType(null);
      setNoteText("");
    },
    onError: (error: any) => {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to reject request.",
        variant: "destructive",
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest("POST", `/api/payout-issues/${id}/resolve`, { notes });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Issue Resolved",
        description: "Payout issue has been marked as fully resolved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payout-issues"] });
      setSelectedIssue(null);
      setActionType(null);
      setNoteText("");
    },
    onError: (error: any) => {
      toast({
        title: "Action Failed",
        description: error.message || "Failed to resolve issue.",
        variant: "destructive",
      });
    },
  });

  const filteredIssues = issues.filter((issue) => {
    const query = searchQuery.toLowerCase();
    return (
      issue.customerPhone.toLowerCase().includes(query) ||
      (issue.customerName && issue.customerName.toLowerCase().includes(query)) ||
      (issue.transactionId && issue.transactionId.toLowerCase().includes(query))
    );
  });

  const pendingCount = issues.filter((i) => i.status === "pending_approval").length;
  const approvedCount = issues.filter((i) => i.status === "approved").length;
  const resolvedCount = issues.filter((i) => i.status === "resolved").length;

  const handleActionConfirm = () => {
    if (!selectedIssue || !actionType) return;

    if (actionType === "approve") {
      approveMutation.mutate({ id: selectedIssue.id, notes: noteText });
    } else if (actionType === "reject") {
      if (!noteText.trim()) {
        toast({ title: "Reason Required", description: "Please enter a rejection reason.", variant: "destructive" });
        return;
      }
      rejectMutation.mutate({ id: selectedIssue.id, reason: noteText });
    } else if (actionType === "resolve") {
      resolveMutation.mutate({ id: selectedIssue.id, notes: noteText });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_approval":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200"><Clock className="w-3 h-3 mr-1" /> Pending Approval</Badge>;
      case "approved":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-200"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case "resolved":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Resolved</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <Header title="SMAID — Payout Resolver & Approval Queue" />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Total Issues</CardTitle>
              <AlertCircle className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{issues.length}</div>
              <p className="text-xs text-slate-400 mt-1">Reported payout queries</p>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/30 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">Pending Approval</CardTitle>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
              <p className="text-xs text-amber-600/80 mt-1">Requires Admin 1-Click Approval</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Approved Retries</CardTitle>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700">{approvedCount}</div>
              <p className="text-xs text-emerald-600/80 mt-1">Approved for payment reprocessing</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/30 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Fully Resolved</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{resolvedCount}</div>
              <p className="text-xs text-blue-600/80 mt-1">Completed issues</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by phone, name or TxID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {["all", "pending_approval", "approved", "rejected", "resolved"].map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className="capitalize text-xs"
              >
                {st.replace("_", " ")}
              </Button>
            ))}
            <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh list">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Payout Issue List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading SMAID Payout Resolver queue...</div>
          ) : filteredIssues.length === 0 ? (
            <Card className="text-center py-12 border-dashed">
              <CardContent>
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 font-medium">No Payout Issues Found</p>
                <p className="text-xs text-slate-400 mt-1">New payout queries reported via WhatsApp will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            filteredIssues.map((issue) => (
              <Card key={issue.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Customer & Transaction Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900 text-lg">
                          {issue.customerName || "Customer"} ({issue.customerPhone})
                        </span>
                        {getStatusBadge(issue.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5" /> TxID: {issue.transactionId || "N/A"}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          Amount: {issue.currency} {issue.amount || "0.00"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Reported: {new Date(issue.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Bank Details Box */}
                      {issue.bankDetails && (issue.bankDetails.bankName || issue.bankDetails.accountNumber) && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-700 space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <Building2 className="w-3.5 h-3.5 text-blue-600" /> Corrected Bank Info (Submitted via WhatsApp):
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-600">
                            <div><strong>Bank:</strong> {issue.bankDetails.bankName || "-"}</div>
                            <div><strong>Account No:</strong> {issue.bankDetails.accountNumber || "-"}</div>
                            <div><strong>Account Name:</strong> {issue.bankDetails.accountName || "-"}</div>
                            <div><strong>Branch:</strong> {issue.bankDetails.branch || "-"}</div>
                          </div>
                        </div>
                      )}

                      {/* Reason / Admin Notes */}
                      {issue.failureReason && (
                        <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-100 mt-2">
                          <strong>Failure Reason:</strong> {issue.failureReason}
                        </p>
                      )}
                      {issue.adminNotes && (
                        <p className="text-xs text-slate-600 bg-slate-100 p-2 rounded border border-slate-200 mt-2">
                          <strong>Admin Note:</strong> {issue.adminNotes}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => window.open(`https://wa.me/${issue.customerPhone.replace(/[^0-9]/g, "")}`, "_blank")}
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Chat WhatsApp
                      </Button>

                      {issue.status === "pending_approval" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            onClick={() => {
                              setSelectedIssue(issue);
                              setActionType("approve");
                            }}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Approve & Retry Payout
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setSelectedIssue(issue);
                              setActionType("reject");
                            }}
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" /> Reject Request
                          </Button>
                        </>
                      )}

                      {issue.status === "approved" && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                          onClick={() => {
                            setSelectedIssue(issue);
                            setActionType("resolve");
                          }}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Mark Fully Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Confirmation & Action Dialog */}
        <Dialog open={!!selectedIssue} onOpenChange={(open) => !open && setSelectedIssue(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="capitalize">
                {actionType === "approve" && "Approve Payout Retry"}
                {actionType === "reject" && "Reject Payout Request"}
                {actionType === "resolve" && "Mark Issue as Resolved"}
              </DialogTitle>
              <DialogDescription>
                Customer: {selectedIssue?.customerName || selectedIssue?.customerPhone} — TxID: {selectedIssue?.transactionId}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <label className="text-xs font-medium text-slate-700">
                {actionType === "reject" ? "Rejection Reason (Required):" : "Admin Note / Comments (Optional):"}
              </label>
              <Input
                placeholder={actionType === "reject" ? "e.g. Invalid account details provided." : "e.g. Verified with bank API."}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedIssue(null)}>Cancel</Button>
              <Button
                className={
                  actionType === "reject" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                }
                onClick={handleActionConfirm}
                disabled={approveMutation.isPending || rejectMutation.isPending || resolveMutation.isPending}
              >
                Confirm {actionType}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
