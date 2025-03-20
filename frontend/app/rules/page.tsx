"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, use } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { PlusIcon, TagIcon, SendIcon, ArchiveIcon, StarIcon, PencilIcon, TrashIcon } from "lucide-react";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useUserContext } from "@/contexts/UserContext";
import { addRule, deleteRule } from "@/lib/api";
import { toast } from "sonner";
import DraftActionConfig from "./DraftActionConfig";
import UserProfileDropdown from "@/components/UserProfileDropdown";

import "shepherd.js/dist/css/shepherd.css";
import Shepherd from "shepherd.js";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/ui/app-sidebar";

// Prebuilt rules with actions as arrays

const prebuiltRules = [
  {
    id: 1,
    name: "Label High Priority Emails",
    description: "Emails which require priority, immediate action, or are time-sensitive",
    actions: [{ type: "label", config: { labelName: "High Priority" } }],
  },
  {
    id: 2,
    name: "Archive Newsletters",
    description: "Emails which contain a newsletter or news update",
    actions: [{ type: "archive" }],
  },
  {
    id: 3,
    name: "Forward Client Emails",
    description: "Emails and queries from InboxPilot customers about the product",
    actions: [{ type: "forward", config: { forwardTo: "inboxpilots@gmail.com" } }],
  },
  {
    id: 4,
    name: "Auto-Reply to Cold Emails",
    description: "Emails which are cold outreach from someone new to introduce themselves or pitch an idea",
    actions: [
      {
        type: "draft",
        config: {
          /*draftTo: "forward@example.com",*/ draftTemplate: "Thank the sender for reaching out and personalize by mentioning a specific aspect of their email",
        },
      },
    ],
  },
  {
    id: 5,
    name: "Favorite all Receipts",
    description: "Emails which contain receipts, invoices or order confirmations",
    actions: [{ type: "favorite" }],
  },
];

// Action types for adding actions
const actionTypes = [
  { value: "label", label: "Label", icon: TagIcon },
  { value: "forward", label: "Forward", icon: SendIcon },
  { value: "draft", label: "Draft Reply", icon: PencilIcon },
  { value: "archive", label: "Archive", icon: ArchiveIcon },
  { value: "favorite", label: "Favorite", icon: StarIcon },
];

// Define the Action interface
interface Action {
  type: string;
  config: Record<string, any>;
}

// Updated Rule interface with actions as an array
interface Rule {
  id: string;
  ruleIndex?: string;
  name: string;
  description: string;
  actions: Action[];
}

export default function RulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>([]);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isConfigureRuleOpen, setIsConfigureRuleOpen] = useState(false);
  const [selectedPrebuiltRule, setSelectedPrebuiltRule] = useState<Rule | null>(null);
  const [currentRule, setCurrentRule] = useState<Rule | null>(null);
  const [logoutSuccess, setLogoutSuccess] = useState(false);
  const [tour, setTour] = useState<Shepherd.Tour | null>(null);

  const { user, loading, error } = useUserContext();
  const [listenerStatus, setListenerStatus] = useState<number | null>(null);

  const fetchListenerStatus = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${user.id}/listener-status`);
      setListenerStatus(response.data.status); // Should be 0 or 1
    } catch (error) {
      console.error("Failed to fetch listener status:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchListenerStatus();
    }
  }, [user]);

  useEffect(() => {
    const newTour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        text: "Click here to add a new rule for your email inbox",
        attachTo: {
          element: "#add-rule-button",
          on: "bottom",
        },
        classes: "shepherd-theme-default bg-black text-white",
        // classes: 'shepherd-theme-default',
        scrollTo: true,
        popperOptions: {
          modifiers: [
            {
              name: "offset",
              options: {
                offset: [0, 12],
              },
            },
          ],
        },
        exitOnEsc: true,
        keyboardNavigation: true,
      },
    });

    newTour.addStep({
      id: "example-step",
      text: "Click here to add a new rule for your email inbox",
      attachTo: {
        element: "#add-rule-button",
        on: "bottom",
      },
      modalOverlayOpeningRadius: 8,
      buttons: [
        {
          text: "Exit Tour",
          action: () => newTour.cancel(),
        },
      ],
    });

    newTour.addStep({
      id: "dialog-step",
      text: "You can choose from prebuilt rules or create a custom rule. Let's create a custom rule for now",
      attachTo: {
        element: "[data-dialog-content]",
        on: "bottom-start",
      },
      classes: "shepherd-dialog-step",
      modalOverlayOpeningRadius: 4,
      buttons: [
        {
          text: "Exit Tour",
          classes: "shephard-button-exit",
          action() {
            setIsAddRuleOpen(false); // Close dialog first
            newTour.cancel();
          },
        },
      ],
    });

    newTour.addStep({
      id: "configure-step1",
      text: "To configure the rule, start by giving it a name.\n Next, describe the condition for an email to apply to the rule. Finally, add actions to be performed when the condition is met",
      attachTo: {
        element: "[data-configure-content]",
        on: "bottom-start",
      },
      classes: "shepherd-dialog-step",
      modalOverlayOpeningRadius: 4,
      buttons: [
        {
          text: "Exit Tour",
          classes: "shephard-button-exit",
          action() {
            setIsConfigureRuleOpen(false); // Close dialog first
            newTour.cancel();
          },
        },
      ],
    });

    newTour.addStep({
      id: "finish-step",
      text: "Thanks for taking the tour! You can always start it again by clicking the button",
      attachTo: {
        element: "#tour-finish",
        on: "bottom",
      },
      buttons: [
        {
          text: "Exit Tour",
          action: () => newTour.cancel(),
        },
      ],
    });

    setTour(newTour);
  }, []);

  // Fetch and parse rules from the backend
  useEffect(() => {
    if (user && user.rules) {
      const transformedRules: Rule[] = Object.entries(user.rules).map(([key, ruleData]) => ({
        id: key, // Use the key as the unique id
        ruleIndex: key, // This can still be used if needed for backend operations
        name: ruleData.action,
        description: ruleData.prompt,
        actions: ruleData.type || [],
      }));
      console.log("Transformed rules:", transformedRules);
      setRules(transformedRules);
    }
  }, [user]);

  useEffect(() => {
    if (isAddRuleOpen && tour.isActive()) {
      setTimeout(() => {
        tour.show("dialog-step");
      }, 100);
    } else if (tour?.isActive() && !isConfigureRuleOpen) {
      tour.complete();
    }
  }, [isAddRuleOpen]);

  useEffect(() => {
    if (tour?.isActive() && isConfigureRuleOpen) {
      setTimeout(() => {
        tour.show("configure-step1");
      }, 100);
    } else if (tour?.isActive() && !isConfigureRuleOpen) {
      // tour.complete();
      //move to next step
      // tour.next();
      tour.show("finish-step");
    }
  }, [isConfigureRuleOpen]);

  // Handle adding a new rule
  const handleAddRule = (prebuiltRule: Rule) => {
    if (prebuiltRule.name === "Custom Rule") {
      // Initialize a custom rule with empty actions
      setSelectedPrebuiltRule({
        id: "", // Assign a unique ID if necessary
        name: "Custom Rule",
        description: "Create a custom rule",
        actions: [],
      });
    } else {
      // Use the selected prebuilt rule
      setSelectedPrebuiltRule(prebuiltRule);
    }
    setCurrentRule(null); // Clear any existing selection
    setIsAddRuleOpen(false);
    setIsConfigureRuleOpen(true);
  };

  const handleSaveRule = async (configuredRule: Rule) => {
    // Transform actions for storage.
    // For draft actions, convert any file objects to an object with fileName.
    const actionsForStorage = configuredRule.actions.map((action) => {
      if (action.type === "draft") {
        const { contextFiles, ...restConfig } = action.config;
        const filesData =
          contextFiles && Array.isArray(contextFiles)
            ? contextFiles.map((file) => {
                // If the file is a raw File object, return minimal info.
                if (file instanceof File) {
                  return { fileName: file.name };
                }
                // If the file already has enriched metadata (e.g., s3Url), return it as is.
                if (file && file.s3Url) {
                  return file;
                }
                // Otherwise, default to using fileName.
                if (typeof file === "object") {
                  return { fileName: file.fileName || file.name || "" };
                }
                return { fileName: file };
              })
            : [];
        return { type: action.type, config: { ...restConfig, contextFiles: filesData } };
      }
      return action;
    });

    // Create a serialized rule with actions stored as a JSON string.
    const serializedRule = {
      action: configuredRule.name,
      prompt: configuredRule.description,
      type: actionsForStorage,
    };

    let savedRuleId: string | null = null;

    if (currentRule) {
      // Update existing rule
      setRules(
        rules.map((rule) =>
          rule.id === currentRule.id
            ? {
                ...rule,
                name: configuredRule.name,
                description: configuredRule.description,
                actions: configuredRule.actions,
              }
            : rule
        )
      );
      try {
        await axios.put(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${user.id}/rules/${currentRule.id}`, serializedRule, { withCredentials: true });
        savedRuleId = currentRule.id;
      } catch (error) {
        console.error("Failed to update rule:", error);
      }
    } else {
      // Add new rule
      try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${user.id}`, serializedRule, { withCredentials: true });
        const newRule = {
          id: response.data.id, // assuming the backend returns the new rule's ID
          name: configuredRule.name,
          description: configuredRule.description,
          actions: configuredRule.actions,
        };
        setRules([...rules, newRule]);
        savedRuleId = newRule.id;
      } catch (error) {
        console.error("Failed to add rule:", error);
      }
    }

    // After saving the rule, loop through draft actions and upload any new files.
    // This step replaces raw File objects with the enriched file objects from the backend.
    for (let i = 0; i < configuredRule.actions.length; i++) {
      const action = configuredRule.actions[i];
      if (action.type === "draft" && action.config.contextFiles && action.config.contextFiles.some((file) => file instanceof File)) {
        const formData = new FormData();
        // Append only the raw File objects
        const rawFiles = action.config.contextFiles.filter((file) => file instanceof File);
        rawFiles.forEach((file) => {
          formData.append("files", file);
        });
        // Pass along the rule identifier. In this example, we use the saved rule ID.
        formData.append("ruleIndex", savedRuleId);

        try {
          const uploadResponse = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${user.id}/upload-rule-files`, formData, {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          });
          // Assume that the backend returns the enriched file objects in uploadResponse.data.files.
          const enrichedFiles = uploadResponse.data.files;
          // Filter out raw file entries: those that are instances of File or don't have s3Url.
          const existingEnriched = action.config.contextFiles.filter((file) => !(file instanceof File) && file.s3Url !== undefined);
          // Merge the new enriched files with the existing enriched ones
          const updatedFiles = [...existingEnriched, ...enrichedFiles];
          action.config.contextFiles = updatedFiles;
          toast.success("Files uploaded successfully.");
        } catch (uploadError) {
          console.error("Failed to upload files:", uploadError);
          toast.error("Failed to upload files.");
        }
      }
    }

    setIsConfigureRuleOpen(false);
    setCurrentRule(null);
  };

  // Handle editing a rule
  const handleEditRule = (rule: Rule) => {
    setCurrentRule(rule);
    setIsConfigureRuleOpen(true);
  };

  // Handle deleting a rule
  const handleDeleteRule = async (ruleId: string) => {
    try {
      await deleteRule(user.id, ruleId);
      setRules(rules.filter((rule) => rule.id !== ruleId));
    } catch (error) {
      console.error("Failed to delete rule:", error);
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        console.log("Logged out");
        router.push("/");
      } else {
        const errorData = await response.json();
        console.error("Failed to log out", errorData);
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const toggleListener = async () => {
    console.log("Toggling listener");
    try {
      const newStatus = listenerStatus === 1 ? 0 : 1;
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${user.id}/toggle-listener`, { status: newStatus });

      if (response.status === 200) {
        setListenerStatus(newStatus);
        toast.success(`Listener ${newStatus === 1 ? "Attached" : "Detached"} Successfully`);
      } else {
        toast.error("Failed to update listener status.");
      }
    } catch (error) {
      console.error("Error toggling listener:", error);
      toast.error("Error toggling listener");
    }
  };

  // Handle loading and error states
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-gray-800 border-t-transparent border-solid rounded-full animate-spin"></div>
      </div>
    );
  } else if (!user) {
    router.push("/");
    return null; // Prevent rendering below
  } else if (error) {
    return <div>Error: {error}</div>;
  } else {
    return (
      <SidebarProvider>
        <AppSidebar currentTab="Rules" />
        <SidebarTrigger />
        <div className="container mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Email Rules</h1>
            <div className="flex items-center space-x-4" id="tour-finish">
              <UserProfileDropdown name={user.name || "John Doe"} email={user.email} tour={tour} />
            </div>
          </div>

          {/* Add Rule Button */}
          <div className="flex mb-6 space-x-4 items-center">
            <Button id="add-rule-button" onClick={() => setIsAddRuleOpen(true)} className="mb-2">
              Add Rule <PlusIcon className="mr-2 h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2 mb-2 ml-4">
              <Switch checked={listenerStatus === 1} onClick={toggleListener} />
              <Label htmlFor="listenerStatus">{listenerStatus === 1 ? "Applying Rules" : "Not Applying Rules"}</Label>
            </div>
          </div>

          {/* Rules Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Edit</TableHead>
                <TableHead>Delete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.name}</TableCell>
                  <TableCell>{rule.description}</TableCell>
                  <TableCell>
                    {rule.actions.map((action, idx) => (
                      <span key={idx} className="block">
                        {action.type.charAt(0).toUpperCase() + action.type.slice(1)}
                      </span>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" onClick={() => handleEditRule(rule)}>
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" onClick={() => handleDeleteRule(rule.id)}>
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Add Rule Dialog */}

          <Dialog open={isAddRuleOpen} onOpenChange={setIsAddRuleOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a New Rule</DialogTitle>
                <DialogDescription>Choose a prebuilt rule or create a custom one.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                {prebuiltRules.map((rule) => (
                  <Button key={rule.id} variant="outline" onClick={() => handleAddRule(rule)}>
                    {rule.name}
                  </Button>
                ))}
              </div>
              <DialogFooter>
                <Button
                  data-dialog-content
                  variant="outline"
                  onClick={() =>
                    handleAddRule({
                      id: "",
                      name: "Custom Rule",
                      description: "Create a custom rule",
                      actions: [],
                    })
                  }
                >
                  Create Custom Rule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Configure Rule Dialog */}
          <ConfigureRuleDialog isOpen={isConfigureRuleOpen} onOpenChange={setIsConfigureRuleOpen} prebuiltRule={selectedPrebuiltRule} currentRule={currentRule} onSave={handleSaveRule} setCurrentRule={setCurrentRule} setRules={setRules} />
        </div>
      </SidebarProvider>
    );
  }
}

// Dialog component for configuring rules
function ConfigureRuleDialog({ isOpen, onOpenChange, prebuiltRule, currentRule, onSave, setCurrentRule, setRules }) {
  const { user } = useUserContext();
  const [ruleName, setRuleName] = useState(currentRule?.name || prebuiltRule?.name || "");
  const [ruleDescription, setRuleDescription] = useState(currentRule?.description || prebuiltRule?.description || "");
  const [actions, setActions] = useState<Action[]>([]);

  // Initialize form fields when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (currentRule) {
        setRuleName(currentRule.name);
        setRuleDescription(currentRule.description);
        setActions(
          currentRule.actions.map((action) => ({
            type: action.type,
            config: { ...action.config },
          }))
        );
      } else if (prebuiltRule) {
        setRuleName(prebuiltRule.name);
        setRuleDescription(prebuiltRule.description);
        setActions(
          prebuiltRule.actions.map((action) => ({
            type: action.type,
            config: { ...action.config },
          }))
        );
      } else {
        setRuleName("");
        setRuleDescription("");
        setActions([]);
      }
    }
  }, [isOpen, currentRule, prebuiltRule]);

  const handleCancel = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${user.id}/rules`, { withCredentials: true });
      const rawRules = response.data;
      const transformedRules = rawRules.map((rule) => ({
        id: rule.ruleIndex,
        ruleIndex: rule.ruleIndex,
        name: rule.action,
        description: rule.prompt,
        actions: rule.type || [],
      }));
      setRules(transformedRules);
      const updatedRule = transformedRules.find((rule) => String(rule.ruleIndex) === String(currentRule.ruleIndex));
      if (updatedRule) {
        setCurrentRule(updatedRule);
        setActions(updatedRule.actions);
      }
    } catch (error) {}
    onOpenChange(false);
  };

  // Add a new action to the rule
  const handleAddAction = (type: string) => {
    const restrictedTypes = ["draft", "archive", "favorite"];
    if (restrictedTypes.includes(type)) {
      const hasExisting = actions.some((action) => action.type === type);
      if (hasExisting) {
        toast.error(`You can only have one ${type} action.`);
        return;
      }
    }
    const newAction: Action = { type, config: {} };
    setActions([...actions, newAction]);
  };

  // Update action configuration
  const handleActionConfigChange = (index: number, config: Record<string, any>) => {
    const newActions = [...actions];
    newActions[index].config = config;
    setActions(newActions);
  };

  // Remove an action from the rule
  const handleRemoveAction = (index: number) => {
    const newActions = [...actions];
    newActions.splice(index, 1);
    setActions(newActions);
  };

  const canSaveRule = () => {
    if (!ruleName.trim() || !ruleDescription.trim()) return false;

    for (const action of actions) {
      if (action.type === "label" && !action.config.labelName?.trim()) return false;
      if (action.type === "forward" && !action.config.forwardTo?.trim()) return false;
      if (action.type === "draft" && !action.config.draftTemplate?.trim()) return false;
    }

    return actions.length > 0;
  };

  // Save the configured rule
  const handleSave = () => {
    onSave({ name: ruleName, description: ruleDescription, actions });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent data-configure-content className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{currentRule ? "Edit Rule" : "Configure Rule"}</DialogTitle>
          <DialogDescription>{currentRule ? "Modify your existing rule" : "Customize your rule and add actions."}</DialogDescription>
        </DialogHeader>
        <div className="flex 1 overflow-y-auto grid gap-4 p-4">
          {/* Rule Name */}
          <div>
            <Label htmlFor="ruleName">Rule Name</Label>
            <Input id="ruleName" value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="ex. Job search rule" />
          </div>

          {/* Rule Description */}
          <div>
            <Label htmlFor="ruleDescription">Email Condition</Label>
            <Input id="ruleDescription" value={ruleDescription} onChange={(e) => setRuleDescription(e.target.value)} placeholder="ex. Emails about my job and internship search" />
          </div>

          {/* Action Types */}
          <div>
            <Label>Actions</Label>
            <div className="flex gap-2 mt-2">
              {actionTypes.map((actionType) => (
                <Button key={actionType.value} variant="outline" onClick={() => handleAddAction(actionType.value)} className="flex-1 px-2 py-2 whitespace-nowrap">
                  <actionType.icon className="h-4 w-4" />
                  {actionType.label}
                </Button>
              ))}
            </div>
          </div>

          {/* List of Actions */}
          {actions.map((action, index) => (
            <div key={index} className="border rounded-lg p-4 relative">
              <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => handleRemoveAction(index)}>
                <TrashIcon className="h-4 w-4" />
              </Button>
              <ActionConfig action={action} onConfigChange={(config) => handleActionConfigChange(index, config)} ruleIndex={currentRule?.ruleIndex || prebuiltRule?.ruleIndex} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSaveRule()}>
            {currentRule ? "Update Rule" : "Save Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Component to configure individual actions
function ActionConfig({ action, onConfigChange, ruleIndex }: { action: Action; onConfigChange: (config: Record<string, any>) => void; ruleIndex?: string }) {
  switch (action.type) {
    case "label":
      return (
        <div>
          <Label htmlFor="labelName">Label Name</Label>
          <Input id="labelName" value={action.config.labelName || ""} onChange={(e) => onConfigChange({ ...action.config, labelName: e.target.value })} placeholder="Enter label name" />
        </div>
      );
    case "forward":
      return (
        <div>
          <Label htmlFor="forwardTo">Forward To</Label>
          <Input id="forwardTo" value={action.config.forwardTo || ""} onChange={(e) => onConfigChange({ ...action.config, forwardTo: e.target.value })} placeholder="Enter email to forward to" />
        </div>
      );
    case "draft":
      return <DraftActionConfig action={action} onConfigChange={onConfigChange} ruleIndex={ruleIndex} />;
    case "archive":
      return (
        <div>
          <Label>Archive Immediately</Label>
          <p className="text-sm text-gray-500">This action will be applied automatically.</p>
        </div>
      );
    case "favorite":
      return (
        <div>
          <Label>Favorite Immediately</Label>
          <p className="text-sm text-gray-500">This action will be applied automatically.</p>
        </div>
      );
    default:
      return null;
  }
}
