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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusIcon, TagIcon, SendIcon, ArchiveIcon, StarIcon, PencilIcon, TrashIcon, LogOutIcon, MailXIcon, TramFront } from "lucide-react";
import useCurrentUser from "@/hooks/useCurrentUser";
import { addRule, deleteRule } from "@/lib/api";
import { Toaster, toast } from "sonner";
import "react-toastify/dist/ReactToastify.css";

import 'shepherd.js/dist/css/shepherd.css';
import Shepherd from 'shepherd.js';




import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

import { AppSidebar } from "@/components/ui/app-sidebar"

// Prebuilt rules with actions as arrays

const prebuiltRules = [
  {
    id: 1,
    name: "Label High Priority Emails",
    description: "Automatically label emails marked as high priority",
    actions: [{ type: "label", config: { labelName: "High Priority" } }],
  },
  {
    id: 2,
    name: "Archive Newsletters",
    description: "Automatically archive emails identified as newsletters",
    actions: [{ type: "archive" }],
  },
  {
    id: 3,
    name: "Forward Client Emails",
    description: "Forward emails from specific clients to team members",
    actions: [{ type: "forward", config: { forwardTo: "team@example.com" } }],
  },
  {
    id: 4,
    name: "Auto-Reply to Out of Office",
    description: "Send automatic replies when out of office",
    actions: [{ type: "draft", config: { /*draftTo: "forward@example.com",*/ draftTemplate: "I'm currently out of office and will reply upon my return." } }],
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
  const { user, loading, error, clearUser } = useCurrentUser();
  const [logoutSuccess, setLogoutSuccess] = useState(false);
  const [tour, setTour] = useState<Shepherd.Tour | null>(null);

  useEffect(() => {

    const newTour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        text: 'Click here to add a new rule for your email inbox',
        attachTo: {
          element: '#add-rule-button',
          on: 'bottom'
        },
        classes: 'shepherd-theme-default bg-black text-white',
        // classes: 'shepherd-theme-default',
        scrollTo: true,
        popperOptions: {
          modifiers: [{
            name: 'offset',
            options: {
              offset: [0, 12]
            }
          }]
        },
        exitOnEsc: true,
        keyboardNavigation: true

      }
    });

    newTour.addStep({
      id: 'example-step',
      text: 'Click here to add a new rule for your email inbox',
      attachTo: {
        element: '#add-rule-button',
        on: 'bottom'
      },
      modalOverlayOpeningRadius: 8,
      buttons: [
        {
          text: 'Exit Tour',
          action: () => newTour.cancel()
        }
      ]
    });

    newTour.addStep({
      id: 'dialog-step',
      text: 'You can choose from prebuilt rules or create a custom rule. Let\'s create a custom rule for now',
      attachTo: {
        element: '[data-dialog-content]',
        on: 'bottom-start'
      },
      classes: 'shepherd-dialog-step',
      modalOverlayOpeningRadius: 4,
      buttons: [
        {
          text: 'Exit Tour',
          classes: 'shephard-button-exit', 
          action() {
            setIsAddRuleOpen(false); // Close dialog first
            newTour.cancel();
        }
        }
      ]
    });


    newTour.addStep({
      id: 'configure-step1',
      text: 'To configure the rule, start by giving it a name.\n Next, describe the condition for an email to apply to the rule. Finally, add actions to be performed when the condition is met',
      attachTo: {
        element: '[data-configure-content]',
        on: 'bottom-start'
      },
      classes: 'shepherd-dialog-step',
      modalOverlayOpeningRadius: 4,
      buttons: [
        {
          text: 'Exit Tour',
          classes: 'shephard-button-exit', 
          action() {
            setIsConfigureRuleOpen(false); // Close dialog first
            newTour.cancel();
        }
        }
      ]
    }); 

    newTour.addStep({
      id: 'finish-step',
      text: 'Thanks for taking the tour! You can always start it again by clicking the button',
      attachTo: {
        element: '#tour-finish',
        on: 'bottom'
      },
      buttons: [
        {
          text: 'Exit Tour',
          action: () => newTour.cancel()
        }
      ]
    });

    setTour(newTour);

  }, []);    

  // Fetch and parse rules from the backend
  useEffect(() => {
    if (user && user.rules) {
      const transformedRules: Rule[] = Object.entries(user.rules).map(([key, ruleData]) => ({
        id: key,
        name: ruleData.action,
        description: ruleData.prompt,
        actions: typeof ruleData.type === "string" ? JSON.parse(ruleData.type) : ruleData.type,
      }));
      setRules(transformedRules);
    }
  }, [user]);

  useEffect(() => {

    if (isAddRuleOpen && tour.isActive()) {
    setTimeout(() => {
      tour.show('dialog-step');
    }, 100);
    }

    else if (tour?.isActive() && !isConfigureRuleOpen) {
      tour.complete();
    }


  }, [isAddRuleOpen]);

  useEffect(() => {
    if (tour?.isActive() && isConfigureRuleOpen) {
      
      setTimeout(() => {
        tour.show('configure-step1');
      }, 100);
    }

    else if (tour?.isActive() && !isConfigureRuleOpen) {
      // tour.complete();
      //move to next step
      // tour.next();
      tour.show('finish-step');
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

  // Handle saving a rule (both add and update)
  const handleSaveRule = async (configuredRule: Rule) => {
    const serializedRule = {
      action: configuredRule.name,
      prompt: configuredRule.description,
      type: JSON.stringify(configuredRule.actions), // Stringify actions for backend
    };

    if (currentRule) {
      // Update existing rule
      // console.log(user.id);
      
      setRules(rules.map((rule) => (rule.id === currentRule.id ? { ...rule, name: configuredRule.name, description: configuredRule.description, actions: configuredRule.actions } : rule)));
      try {
        await axios.put(`http://localhost:3010/api/users/${user.id}/rules/${currentRule.id}`, serializedRule, { withCredentials: true });
      } catch (error) {
        console.error("Failed to update rule:", error);
      }
    } else {
      // Add new rule

      try {
        const response = await axios.post(`http://localhost:3010/api/users/${user.id}`, serializedRule, { withCredentials: true });
        const newRule = {
          id: response.data.id, // Generate a unique ID
          name: configuredRule.name,
          description: configuredRule.description,
          actions: configuredRule.actions,
        };
        setRules([...rules, newRule]);
      } catch (error) {
        console.error("Failed to add rule:", error);
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
      const response = await fetch("http://localhost:3010/api/users/logout", {
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

  //! new
  const detachGmailListener = async () => {
    try {
      const response = await axios.post("http://localhost:3010/api/users/detach-gmail-listener", {}, { withCredentials: true });
      if (response.status === 200) {
        console.log("Gmail listener detached successfully");
        toast.success("Gmail listener detached successfully");
      } else {
        console.error("Failed to detach Gmail listener", response.data);
        toast.error("Failed to detach Gmail listener");
      }
    } catch (error) {
      console.error("Error detaching Gmail listener:", error);
      toast.error("Error detaching Gmail listener");
    }
  };

  // Handle loading and error states
  if (loading) {
    return <div>Loading...</div>;
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
                <div className="text-right">
                  <p className="font-medium">{user.name ? user.name : "John Doe"}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <DropdownMenu >
                  <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer bg-black text-white">
                      <AvatarImage src="" alt="User avatar" />
                      <AvatarFallback className="bg-black text-white">{user.email ? user.email.charAt(0).toUpperCase() : "U"}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOutIcon className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={detachGmailListener} className="cursor-pointer">
                      <MailXIcon className="mr-2 h-4 w-4" />
                      <span>Detach Gmail Listener</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => tour.start()} className="cursor-pointer">
                      <TramFront className="mr-2 h-4 w-4" />
                      <span>Start Tour</span>
                    </DropdownMenuItem>
            
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Add Rule Button */}
            <div className="flex mb-6 space-x-4">
            <Button id="add-rule-button" onClick = {() => setIsAddRuleOpen(true)} className="mb-2">
              Add Rule <PlusIcon className="mr-2 h-4 w-4" />
            </Button>

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

            <Dialog open={isAddRuleOpen} onOpenChange = {setIsAddRuleOpen}>
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

                  <Button data-dialog-content variant="outline" onClick={() => handleAddRule({ id: "", name: "Custom Rule", description: "Create a custom rule", actions: [] })}>
                    Create Custom Rule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Configure Rule Dialog */}
            <ConfigureRuleDialog isOpen={isConfigureRuleOpen} onOpenChange={setIsConfigureRuleOpen} prebuiltRule={selectedPrebuiltRule} currentRule={currentRule} onSave={handleSaveRule} />
          </div>
      
      </SidebarProvider>
    );
  }
}

// Dialog component for configuring rules
function ConfigureRuleDialog({ isOpen, onOpenChange, prebuiltRule, currentRule, onSave }) {
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
            <div className="flex flex-wrap gap-2 mt-2">
              {actionTypes.map((actionType) => (
                <Button key={actionType.value} variant="outline" onClick={() => handleAddAction(actionType.value)}>
                  <actionType.icon className="mr-2 h-4 w-4" />
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
              <ActionConfig action={action} onConfigChange={(config) => handleActionConfigChange(index, config)} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
function ActionConfig({ action, onConfigChange }: { action: Action; onConfigChange: (config: Record<string, any>) => void }) {
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
      return (
        <div>
          <Label htmlFor="draftTemplate">Draft Template</Label>
          {/* <Input
            id="draftTo"
            value={action.config.draftTo || ''}
            onChange={(e) => onConfigChange({ ...action.config, draftTo: e.target.value })}
            placeholder="Enter email to draft to"
          /> */}

          <Input id="draftTemplate" value={action.config.draftTemplate || ""} onChange={(e) => onConfigChange({ ...action.config, draftTemplate: e.target.value })} placeholder="Enter instructions for the reply draft" />
        </div>
      );
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
