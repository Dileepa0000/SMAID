import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Channel } from "@shared/schema";
import { CheckCircle, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

const channelFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().min(10, "Valid phone number required"),
  phoneNumberId: z.string().min(1, "Phone Number ID is required"),
  wabaId: z.string().min(1, "Business Account ID is required"),
  appId: z.string().min(1, "App ID is required"),
  accessToken: z.string().min(1, "Access Token is required"),
  businessAccountId: z.string().optional(),
  mmLiteEnabled: z.boolean().default(false),
  mmLiteApiUrl: z.string().optional(),
  mmLiteApiKey: z.string().optional(),
});

interface ChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingChannel: Channel | null;
  onSuccess: () => void;
}

export function ChannelDialog({ open, onOpenChange, editingChannel, onSuccess }: ChannelDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  const channelForm = useForm<z.infer<typeof channelFormSchema>>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      phoneNumberId: "",
      wabaId: "",
      appId: "",
      accessToken: "",
      businessAccountId: "",
      mmLiteEnabled: false,
      mmLiteApiUrl: "",
      mmLiteApiKey: "",
    },
  });

  useEffect(() => {
    setTestResult(null);
    if (editingChannel) {
      channelForm.reset({
        name: editingChannel.name,
        phoneNumber: editingChannel.phoneNumber || "",
        phoneNumberId: editingChannel.phoneNumberId,
        wabaId: editingChannel.whatsappBusinessAccountId || "",
        appId: editingChannel.appId || "",
        accessToken: editingChannel.accessToken,
        businessAccountId: "",
        mmLiteEnabled: (editingChannel as any).mmLiteEnabled || false,
        mmLiteApiUrl: (editingChannel as any).mmLiteApiUrl || "",
        mmLiteApiKey: (editingChannel as any).mmLiteApiKey || "",
      });
    } else {
      channelForm.reset();
    }
  }, [editingChannel, channelForm]);

  // ─── Test Credentials ────────────────────────────────────────────────────
  const testCredentialsMutation = useMutation({
    mutationFn: async () => {
      const values = channelForm.getValues();
      if (!values.phoneNumberId || !values.accessToken) {
        throw new Error("Please fill in Phone Number ID and Access Token first");
      }
      const res = await apiRequest("POST", "/api/channels/test-credentials", {
        phoneNumberId: values.phoneNumberId,
        accessToken: values.accessToken,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Test failed");
      return data;
    },
    onSuccess: (data) => {
      setTestResult("success");
      toast({
        title: "✅ Credentials Valid",
        description: `Connected to: ${data.phoneNumber || "WhatsApp Business API"}`,
      });
    },
    onError: (error: Error) => {
      setTestResult("error");
      toast({
        title: "❌ Credentials Invalid",
        description: error.message || "Could not connect with these credentials.",
        variant: "destructive",
      });
    },
  });

  // ─── Create / Update Channel ─────────────────────────────────────────────
  const createChannelMutation = useMutation({
    mutationFn: async (data: z.infer<typeof channelFormSchema>) => {
      const payload = {
        name: data.name,
        phoneNumber: data.phoneNumber,
        phoneNumberId: data.phoneNumberId,
        whatsappBusinessAccountId: data.wabaId,
        appId: data.appId,
        businessAccountId: data.businessAccountId,
        accessToken: data.accessToken,
        mmLiteEnabled: data.mmLiteEnabled,
        mmLiteApiUrl: data.mmLiteApiUrl,
        mmLiteApiKey: data.mmLiteApiKey,
      };

      if (editingChannel) {
        return await apiRequest("PUT", `/api/channels/${editingChannel.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/channels", payload);
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });

      if (!editingChannel && data.healthStatus) {
        if (data.healthStatus === "healthy") {
          toast({
            title: "Channel created successfully",
            description: "Your channel is connected and healthy!",
          });
        } else if (data.healthStatus === "error") {
          toast({
            title: "Channel created with issues",
            description:
              data.healthDetails?.error ||
              "Channel was created but has connection issues. Please check your credentials.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: editingChannel ? "Channel updated" : "Channel created",
          description: editingChannel
            ? "Your channel has been updated successfully."
            : "Your new channel has been added successfully.",
        });
      }
      onSuccess();
    },
    onError: (error: any) => {
      let errorData = error?.response?.data;

      if (!errorData && typeof error?.message === "string") {
        try {
          const match = error.message.match(/\{.*\}/);
          if (match) errorData = JSON.parse(match[0]);
        } catch {}
      }

      toast({
        title: "Error",
        description:
          errorData?.error ||
          errorData?.message ||
          error?.message ||
          "Something went wrong while saving the channel.",
        variant: "destructive",
      });
    },
  });

  const handleChannelSubmit = (data: z.infer<typeof channelFormSchema>) => {
    createChannelMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingChannel ? "Edit" : "Add New"} WhatsApp Channel</DialogTitle>
          <DialogDescription>
            Configure your WhatsApp Business API credentials and settings.
          </DialogDescription>
        </DialogHeader>

        <Form {...channelForm}>
          <form onSubmit={channelForm.handleSubmit(handleChannelSubmit)} className="space-y-4">
            <FormField
              control={channelForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Channel Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Business" {...field} />
                  </FormControl>
                  <FormDescription>A friendly name to identify this channel</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={channelForm.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormDescription>The WhatsApp Business phone number</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={channelForm.control}
              name="appId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta App ID</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789012345" {...field} />
                  </FormControl>
                  <FormDescription>Your Meta (Facebook) App ID</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={channelForm.control}
              name="phoneNumberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number ID</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789012345" {...field} />
                  </FormControl>
                  <FormDescription>
                    Found in Meta Business Suite under WhatsApp settings
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={channelForm.control}
              name="wabaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Business Account ID</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789012345" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your WhatsApp Business Account ID from Meta
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={channelForm.control}
              name="accessToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Token</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Your access token" {...field} />
                  </FormControl>
                  <FormDescription>Your permanent access token from Meta</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={channelForm.control}
              name="businessAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Account ID (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789012345" {...field} />
                  </FormControl>
                  <FormDescription>Your Meta Business Account ID (optional)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Test Result Banner */}
            {testResult === "success" && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>Credentials verified — ready to save!</span>
              </div>
            )}
            {testResult === "error" && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <XCircle className="w-4 h-4 flex-shrink-0" />
                <span>Invalid credentials — please double-check Phone Number ID and Access Token.</span>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="sm:mr-auto"
              >
                Cancel
              </Button>

              {/* Test Credentials */}
              <Button
                type="button"
                variant="outline"
                onClick={() => testCredentialsMutation.mutate()}
                disabled={testCredentialsMutation.isPending}
                className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                {testCredentialsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                Test Credentials
              </Button>

              <Button
                type="submit"
                disabled={user?.username === "demouser" ? true : createChannelMutation.isPending}
              >
                {createChannelMutation.isPending
                  ? "Saving..."
                  : editingChannel
                  ? "Update"
                  : "Create"}{" "}
                Channel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}