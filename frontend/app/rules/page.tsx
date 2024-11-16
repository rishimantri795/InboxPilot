'use client'

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusIcon, TagIcon, SendIcon, ArchiveIcon, StarIcon, PencilIcon, TrashIcon, LogOutIcon } from 'lucide-react';
import useCurrentUser from '@/hooks/useCurrentUser';
import { addRule, deleteRule } from '@/lib/api';

// Prebuilt rules with actions as arrays
const prebuiltRules = [
  { 
    id: 1, 
    name: "Label High Priority Emails", 
    description: "Automatically label emails marked as high priority",
    actions: [
      { type: "label", config: { labelName: "High Priority" } }
    ]
  },
  { 
    id: 2, 
    name: "Archive Newsletters", 
    description: "Automatically archive emails identified as newsletters",
    actions: [
      { type: "archive", config: { archiveImmediately: true } }
    ]
  },
  { 
    id: 3, 
    name: "Forward Client Emails", 
    description: "Forward emails from specific clients to team members",
    actions: [
      { type: "forward", config: { forwardTo: "team@example.com" } }
    ]
  },
  { 
    id: 4, 
    name: "Auto-Reply to Out of Office", 
    description: "Send automatic replies when out of office",
    actions: [
      { type: "draft", config: { /*draftTo: "forward@example.com",*/ draftTemplate: "I'm currently out of office and will reply upon my return." } }
    ]
  },
];

// Action types for adding actions
const actionTypes = [
  { value: "label", label: "Label", icon: TagIcon },
  { value: "forward", label: "Forward", icon: SendIcon },
  { value: "draft", label: "Automatic Draft", icon: PencilIcon },
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


  // Fetch and parse rules from the backend
  useEffect(() => {
    if (user && user.rules) {
      const transformedRules: Rule[] = Object.entries(user.rules).map(([key, ruleData]) => ({
        id: key,
        name: ruleData.action,
        description: ruleData.prompt,
        actions: typeof ruleData.type === 'string' ? JSON.parse(ruleData.type) : ruleData.type,
      }));
      setRules(transformedRules);
    }
  }, [user]);

  // Handle adding a new rule
  const handleAddRule = (prebuiltRule: Rule) => {
    if (prebuiltRule.name === "Custom Rule") {
      // Initialize a custom rule with empty actions
      setSelectedPrebuiltRule({
        id: '', // Assign a unique ID if necessary
        name: "Custom Rule",
        description: "Create a custom rule",
        actions: []
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
      setRules(rules.map(rule => 
        rule.id === currentRule.id ? { ...rule, name: configuredRule.name, description: configuredRule.description, actions: configuredRule.actions } : rule
      ));
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
          actions: configuredRule.actions 
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
      setRules(rules.filter(rule => rule.id !== ruleId));
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
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Email Rules</h1>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-medium">{user.name ? user.name : "John Doe"}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer bg-black text-white">
                  <AvatarImage src="" alt="User avatar" />
                  <AvatarFallback className="bg-black text-white">
                    {user.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="cursor-pointer"
                >
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Add Rule Button */}
        <Button onClick={() => setIsAddRuleOpen(true)} className="mb-4">
          <PlusIcon className="mr-2 h-4 w-4" /> Add Rule
        </Button>
        
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
              <DialogDescription>
                Choose a prebuilt rule or create a custom one.
              </DialogDescription>
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
                variant="outline" 
                onClick={() => handleAddRule({ id: '', name: "Custom Rule", description: "Create a custom rule", actions: [] })}
              >
                Create Custom Rule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Configure Rule Dialog */}
        <ConfigureRuleDialog
          isOpen={isConfigureRuleOpen}
          onOpenChange={setIsConfigureRuleOpen}
          prebuiltRule={selectedPrebuiltRule}
          currentRule={currentRule}
          onSave={handleSaveRule}
        />
      </div>
    );
  }
}

// Dialog component for configuring rules
function ConfigureRuleDialog({ isOpen, onOpenChange, prebuiltRule, currentRule, onSave }) {
  const [ruleName, setRuleName] = useState(currentRule?.name || prebuiltRule?.name || '');
  const [ruleDescription, setRuleDescription] = useState(currentRule?.description || prebuiltRule?.description || '');
  const [actions, setActions] = useState<Action[]>([]);

  // Initialize form fields when dialog opens
  useEffect(() => {
    if (isOpen) {
      if(currentRule) {
        setRuleName(currentRule.name);
        setRuleDescription(currentRule.description);
        setActions(currentRule.actions);
      } else if (prebuiltRule) {
        setRuleName(prebuiltRule.name);
        setRuleDescription(prebuiltRule.description);
        setActions(prebuiltRule.actions);
      } else{
        setRuleName('');
        setRuleDescription('');
        setActions([]);
      }
    }
  },  [isOpen, currentRule, prebuiltRule]);

  // Add a new action to the rule
  const handleAddAction = (type: string) => {
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

  // Save the configured rule
  const handleSave = () => {
    onSave({ name: ruleName, description: ruleDescription, actions });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{currentRule ? 'Edit Rule' : 'Configure Rule'}</DialogTitle>
          <DialogDescription>
            {currentRule ? 'Modify your existing rule' : 'Customize your rule and add actions.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex 1 overflow-y-auto grid gap-4 p-4">
          {/* Rule Name */}
          <div>
            <Label htmlFor="ruleName">Rule Name</Label>
            <Input 
              id="ruleName" 
              value={ruleName} 
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="Enter rule name"
            />
          </div>
          
          {/* Rule Description */}
          <div>
            <Label htmlFor="ruleDescription">Description</Label>
            <Input 
              id="ruleDescription" 
              value={ruleDescription} 
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="Enter rule description"
            />
          </div>
          
          {/* Action Types */}
          <div>
            <Label>Actions</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {actionTypes.map((actionType) => (
                <Button 
                  key={actionType.value} 
                  variant="outline" 
                  onClick={() => handleAddAction(actionType.value)}
                >
                  <actionType.icon className="mr-2 h-4 w-4" />
                  {actionType.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* List of Actions */}
          {actions.map((action, index) => (
            <div key={index} className="border rounded-lg p-4 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => handleRemoveAction(index)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
              <ActionConfig
                action={action}
                onConfigChange={(config) => handleActionConfigChange(index, config)}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!ruleName || actions.length === 0}>
            {currentRule ? 'Update Rule' : 'Save Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Component to configure individual actions
function ActionConfig({ action, onConfigChange }: { action: Action, onConfigChange: (config: Record<string, any>) => void }) {
  switch (action.type) {
    case 'label':
      return (
        <div>
          <Label htmlFor="labelName">Label Name</Label>
          <Input
            id="labelName"
            value={action.config.labelName || ''}
            onChange={(e) => onConfigChange({ ...action.config, labelName: e.target.value })}
            placeholder="Enter label name"
          />
        </div>
      );
    case 'forward':
      return (
        <div>
          <Label htmlFor="forwardTo">Forward To</Label>
          <Input
            id="forwardTo"
            value={action.config.forwardTo || ''}
            onChange={(e) => onConfigChange({ ...action.config, forwardTo: e.target.value })}
            placeholder="Enter email to forward to"
          />
        </div>
      );
    case 'draft':
      return (
        <div>
          <Label htmlFor="draftTemplate">Draft Template</Label>
          {/* <Input
            id="draftTo"
            value={action.config.draftTo || ''}
            onChange={(e) => onConfigChange({ ...action.config, draftTo: e.target.value })}
            placeholder="Enter email to draft to"
          /> */}

          <Input
            id="draftTemplate"
            value={action.config.draftTemplate || ''}
            onChange={(e) => onConfigChange({ ...action.config, draftTemplate: e.target.value })}
            placeholder="Enter draft message"
          />
        </div>
      );
    case 'archive':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="archiveImmediately"
            checked={action.config.archiveImmediately || false}
            onCheckedChange={(checked) => onConfigChange({ ...action.config, archiveImmediately: checked })}
          />
          <Label htmlFor="archiveImmediately">Archive Immediately</Label>
        </div>
      );
    case 'favorite':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="favoriteImmediately"
            checked={action.config.favoriteImmediately || false}
            onCheckedChange={(checked) => onConfigChange({ ...action.config, favoriteImmediately: checked })}
          />
          <Label htmlFor="favoriteImmediately">Favorite Immediately</Label>
        </div>
      );
    default:
      return null;
  }
}
