/**
 * ============================================================
 * Auto Responses — Keyword-triggered bot replies
 * Connected to real /api/auto-responses backend
 * ============================================================
 */

import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery as useChannelQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Edit,
  Trash2,
  Bot,
  Zap,
  Target,
  MoreVertical,
  X,
  Save,
  Loader2,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AutoResponse {
  id: string;
  channelId: string;
  name: string;
  keywords: string;
  responseMessage: string;
  type: string;
  status: string;
  matchMode: string;
  isCaseSensitive: boolean;
  triggerCount: number;
  createdAt: string;
}

const defaultForm = {
  name: "",
  keywords: "",
  responseMessage: "",
  type: "greeting",
  matchMode: "contains",
  isCaseSensitive: false,
  status: "active",
};

// ─── Component ────────────────────────────────────────────────────────────────
const AutoResponses = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  // ─── Active channel ────────────────────────────────────────────────────
  const { data: activeChannel } = useChannelQuery({
    queryKey: queryKeys.channels.active(),
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/channels/active");
      if (!res.ok) return null;
      return await res.json();
    },
  });

  // ─── Fetch auto responses ──────────────────────────────────────────────
  const { data: autoResponses = [], isLoading } = useQuery<AutoResponse[]>({
    queryKey: ["autoResponses", activeChannel?.id],
    queryFn: async () => {
      if (!activeChannel?.id) return [];
      const res = await apiRequest(
        "GET",
        `/api/auto-responses?channelId=${activeChannel.id}`
      );
      if (!res.ok) throw new Error("Failed to fetch auto responses");
      return res.json();
    },
    enabled: !!activeChannel?.id,
  });

  // ─── Create mutation ───────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/auto-responses", {
        ...data,
        channelId: activeChannel?.id,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autoResponses"] });
      toast({ title: "Auto response created!", description: "It's now active and will reply to matching messages." });
      closeDialog();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  // ─── Update mutation ───────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof form> }) => {
      const res = await apiRequest("PUT", `/api/auto-responses/${id}`, data);
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autoResponses"] });
      toast({ title: "Auto response updated!" });
      closeDialog();
    },
    onError: () =>
      toast({ title: "Error updating", variant: "destructive" }),
  });

  // ─── Delete mutation ───────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/auto-responses/${id}`);
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autoResponses"] });
      toast({ title: "Auto response deleted" });
      setOpenDropdown(null);
    },
    onError: () =>
      toast({ title: "Error deleting", variant: "destructive" }),
  });

  // ─── Toggle mutation ───────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/auto-responses/${id}/toggle`);
      if (!res.ok) throw new Error("Failed to toggle");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autoResponses"] });
      setOpenDropdown(null);
    },
    onError: () =>
      toast({ title: "Error toggling status", variant: "destructive" }),
  });

  // ─── Dialog helpers ────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowDialog(true);
  };

  const openEdit = (rule: AutoResponse) => {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      keywords: rule.keywords,
      responseMessage: rule.responseMessage,
      type: rule.type,
      matchMode: rule.matchMode,
      isCaseSensitive: rule.isCaseSensitive,
      status: rule.status,
    });
    setOpenDropdown(null);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!form.keywords.trim()) {
      toast({ title: "At least one keyword is required", variant: "destructive" });
      return;
    }
    if (!form.responseMessage.trim()) {
      toast({ title: "Response message is required", variant: "destructive" });
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  // ─── Filter / search ──────────────────────────────────────────────────
  const filteredResponses = autoResponses.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.keywords.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      selectedFilter === "all" ||
      r.type === selectedFilter ||
      r.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  // ─── Stats ────────────────────────────────────────────────────────────
  const totalRules = autoResponses.length;
  const activeRules = autoResponses.filter((r) => r.status === "active").length;
  const totalTriggers = autoResponses.reduce((s, r) => s + (r.triggerCount || 0), 0);

  const stats = [
    { label: "Total Rules", value: totalRules.toString(), icon: Bot, color: "text-blue-600" },
    { label: "Active Rules", value: activeRules.toString(), icon: Zap, color: "text-green-600" },
    { label: "Total Triggers", value: totalTriggers.toString(), icon: Target, color: "text-purple-600" },
    {
      label: "Keywords", value: autoResponses.reduce((s, r) => s + r.keywords.split(",").filter(Boolean).length, 0).toString(),
      icon: Hash, color: "text-orange-600",
    },
  ];

  // ─── Colour helpers ───────────────────────────────────────────────────
  const getStatusColor = (s: string) =>
    s === "active" ? "bg-green-100 text-green-800" :
    s === "paused" ? "bg-yellow-100 text-yellow-800" :
    "bg-gray-100 text-gray-800";

  const getTypeColor = (t: string) =>
    t === "greeting" ? "bg-blue-100 text-blue-800" :
    t === "sales" ? "bg-purple-100 text-purple-800" :
    t === "support" ? "bg-orange-100 text-orange-800" :
    "bg-teal-100 text-teal-800";

  // ─── No channel connected state ────────────────────────────────────────
  if (!activeChannel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center max-w-md">
          <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Channel Connected</h3>
          <p className="text-sm text-gray-600 mb-4">
            Connect a WhatsApp channel first before setting up auto-replies.
          </p>
          <a
            href="/settings"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Go to Settings → Channels
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-xl sm:text-2xl font-bold text-gray-900">
                Auto Responses
              </h1>
              <p className="hidden sm:block text-sm text-gray-600 mt-1">
                Keyword-triggered instant replies for your WhatsApp channel
              </p>
            </div>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              aria-label="Create Response"
            >
              <Plus className="h-4 w-4" />
              <span>Create Response</span>
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-gray-50">
                  <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or keyword..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="greeting">Greeting</option>
                <option value="sales">Sales</option>
                <option value="support">Support</option>
                <option value="info">Information</option>
                <option value="active">Active only</option>
                <option value="paused">Paused only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}

        {/* List */}
        {!isLoading && (
          <div className="space-y-3 sm:space-y-4">
            {filteredResponses.map((response) => (
              <div
                key={response.id}
                className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                        {response.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(response.status)}`}>
                        {response.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(response.type)}`}>
                        {response.type}
                      </span>
                      {response.matchMode !== "contains" && (
                        <Badge variant="outline" className="text-xs">
                          {response.matchMode}
                        </Badge>
                      )}
                    </div>

                    <div className="mb-3">
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        <strong>Keywords:</strong>{" "}
                        {response.keywords.split(",").map((k) => k.trim()).filter(Boolean).map((k, i) => (
                          <span key={i} className="inline-block bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 text-xs mr-1 mb-1">
                            {k}
                          </span>
                        ))}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-800 bg-gray-50 p-2 sm:p-3 rounded-lg break-words">
                        {response.responseMessage}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{response.triggerCount || 0} triggered</span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Actions */}
                  <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate(response.id)}
                      disabled={toggleMutation.isPending}
                      className={`p-2 rounded-lg transition-colors ${
                        response.status === "active"
                          ? "text-yellow-600 hover:bg-yellow-50"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                      title={response.status === "active" ? "Pause" : "Activate"}
                    >
                      {response.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(response)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Delete this auto response?")) deleteMutation.mutate(response.id);
                      }}
                      disabled={deleteMutation.isPending}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Mobile Dropdown */}
                  <div className="relative lg:hidden flex-shrink-0">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === response.id ? null : response.id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="More actions"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {openDropdown === response.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              response.status === "active"
                                ? "text-yellow-600 hover:bg-yellow-50"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                            onClick={() => toggleMutation.mutate(response.id)}
                          >
                            {response.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            {response.status === "active" ? "Pause" : "Activate"}
                          </button>
                          <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                            onClick={() => openEdit(response)}
                          >
                            <Edit className="w-4 h-4" /> Edit
                          </button>
                          <div className="border-t border-gray-200 my-1" />
                          <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            onClick={() => {
                              if (confirm("Delete this auto response?")) deleteMutation.mutate(response.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredResponses.length === 0 && (
              <div className="bg-white p-8 sm:p-12 rounded-lg shadow-sm border border-gray-200 text-center">
                <Bot className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No auto responses found</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4">
                  {searchTerm || selectedFilter !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Create your first auto response to get started"}
                </p>
                <button
                  onClick={openCreate}
                  className="bg-blue-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Auto Response
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Auto Response" : "Create Auto Response"}</DialogTitle>
            <DialogDescription>
              Set keywords and the automatic reply message. Separate multiple keywords with commas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rule Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Welcome Message"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Keywords <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                placeholder="hello, hi, hey, start"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple keywords with commas</p>
            </div>

            {/* Response Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reply Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.responseMessage}
                onChange={(e) => setForm({ ...form, responseMessage: e.target.value })}
                placeholder="Hi! 👋 Welcome! How can we help you today?"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="greeting">Greeting</option>
                  <option value="sales">Sales</option>
                  <option value="support">Support</option>
                  <option value="info">Information</option>
                </select>
              </div>

              {/* Match Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Match Mode</label>
                <select
                  value={form.matchMode}
                  onChange={(e) => setForm({ ...form, matchMode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="contains">Contains</option>
                  <option value="exact">Exact match</option>
                  <option value="starts_with">Starts with</option>
                </select>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="statusActive"
                checked={form.status === "active"}
                onChange={(e) => setForm({ ...form, status: e.target.checked ? "active" : "paused" })}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="statusActive" className="text-sm text-gray-700">
                Active (will immediately start replying to matching messages)
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="gap-2"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {editingId ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutoResponses;
