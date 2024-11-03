'use client'

import { SetStateAction, useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PlusIcon, TagIcon, SendIcon, ArchiveIcon, StarIcon, PencilIcon, TrashIcon, LogOutIcon } from 'lucide-react'

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
      { type: "draft", config: { draftTemplate: "I'm currently out of office and will reply upon my return." } }
    ]
  },
]

const actionTypes = [
  { value: "label", label: "Label", icon: TagIcon },
  { value: "forward", label: "Forward", icon: SendIcon },
  { value: "draft", label: "Automatic Draft", icon: PencilIcon },
  { value: "archive", label: "Archive", icon: ArchiveIcon },
  { value: "favorite", label: "Favorite", icon: StarIcon },
]

export default function RulesPage() {
  const [rules, setRules] = useState([])
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false)
  const [isConfigureRuleOpen, setIsConfigureRuleOpen] = useState(false)
  const [selectedPrebuiltRule, setSelectedPrebuiltRule] = useState(null)
  const [currentRule, setCurrentRule] = useState(null)
  const [isLoggedIn, setIsLoggedIn] = useState(true) // Assume user is logged in initially
  const [user, setUser] = useState({ name: "John Doe", email: "john.doe@example.com" }) // Mock user data


  const handleAddRule = (prebuiltRule) => {
    if (prebuiltRule.name === "Custom Rule") {
      // For custom rules, initialize with empty actions array
      setSelectedPrebuiltRule({
        name: "Custom Rule",
        description: "Create a custom rule",
        actions: [] // Initialize empty actions array
      })
    } else {
      // For prebuilt rules, use as is
      setSelectedPrebuiltRule(prebuiltRule)
    }
    setCurrentRule(null) // Clear any previously selected custom rule
    setIsAddRuleOpen(false)
    setIsConfigureRuleOpen(true)  
  }

  const handleSaveRule = (configuredRule: any) => {
    if (currentRule) {
      setRules(rules.map(rule => rule.id === currentRule.id ? configuredRule : rule))
    } else {
      setRules([...rules, { ...configuredRule, id: Date.now() }])
    }
    setIsConfigureRuleOpen(false)
    setCurrentRule(null)
  }

  const handleEditRule = (rule) => {
    setCurrentRule(rule)
    setIsConfigureRuleOpen(true)
  }

  const handleDeleteRule = (ruleId) => {
    setRules(rules.filter(rule => rule.id !== ruleId))
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUser(null)
    // Implement actual logout logic here
  }

  const handleLogin = () => {
    setIsLoggedIn(true)
    setUser({ name: "John Doe", email: "john.doe@example.com" }) // Mock user data
    // Implement actual login logic here
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Email Rules</h1>
        <div className="flex items-center space-x-4">
          {isLoggedIn && (
            <div className="text-right">
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer">
                <AvatarImage src="" alt="User avatar" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isLoggedIn ? (
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleLogin}>
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  <span>Log in</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Button onClick={() => setIsAddRuleOpen(true)} className="mb-4">
        <PlusIcon className="mr-2 h-4 w-4" /> Add Rule
      </Button>
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
              <TableCell>{rule.actions.map(action => action.type).join(', ')}</TableCell>
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
            <Button variant="outline" onClick={() => handleAddRule({ name: "Custom Rule", description: "Create a custom rule" , actions: []})}>
              Create Custom Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfigureRuleDialog
        isOpen={isConfigureRuleOpen}
        onOpenChange={setIsConfigureRuleOpen}
        prebuiltRule={selectedPrebuiltRule}
        currentRule={currentRule}
        onSave={handleSaveRule}
      />
    </div>
  )
}

function ConfigureRuleDialog({ isOpen, onOpenChange, prebuiltRule, currentRule, onSave }) {
  const [ruleName, setRuleName] = useState(currentRule?.name || prebuiltRule?.name || '')
  const [ruleDescription, setRuleDescription] = useState(currentRule?.description || prebuiltRule?.description || '')
  const [actions, setActions] = useState<any[]>([]);
  // const [actions, setActions] = useState(currentRule?.actions || prebuiltRule?.actions || [])

  useEffect(() => {
    if (isOpen) {
      if(currentRule) {
        setRuleName(currentRule.name)
        setRuleDescription(currentRule.description)
        setActions(currentRule.actions)
      } else if (prebuiltRule) {
        setRuleName(prebuiltRule.name)
        setRuleDescription(prebuiltRule.description)
        setActions(prebuiltRule.actions)
      } else{
        setRuleName(' ')
        setRuleDescription(' ')
        setActions([])
      }
    }
  },  [isOpen, currentRule, prebuiltRule])

  const handleAddAction = (type) => {
    const newAction = { type, config: {} }
    setActions([...actions, newAction])
  }

  const handleActionConfigChange = (index, config) => {
    const newActions = [...actions]
    newActions[index].config = config
    setActions(newActions)
  }

  const handleRemoveAction = (index) => {
    const newActions = [...actions]
    newActions.splice(index, 1)
    setActions(newActions)
  }

  const handleSave = () => {
    onSave({ name: ruleName, description: ruleDescription, actions })
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{currentRule ? 'Edit Rule' : 'Configure Rule'}</DialogTitle>
          <DialogDescription>
            {currentRule ? 'Modify your existing rule' : 'Customize your rule and add actions.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="ruleName">Rule Name</Label>
            <Input 
              id="ruleName" 
              value={ruleName} 
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="Enter rule name"
            />
          </div>
          <div>
            <Label htmlFor="ruleDescription">Description</Label>
            <Input 
              id="ruleDescription" 
              value={ruleDescription} 
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="Enter rule description"
            />
          </div>
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
  )
}

function ActionConfig({ action, onConfigChange }) {
  switch (action.type) {
    case 'label':
      return (
        <div>
          <Label htmlFor="labelName">Label Name</Label>
          <Input
            id="labelName"
            value={action.config.labelName || ''}
            onChange={(e) => onConfigChange({ ...action.config, labelName: e.target.value })}
          />
        </div>
      )
    case 'forward':
      return (
        <div>
          <Label htmlFor="forwardTo">Forward To</Label>
          <Input
            id="forwardTo"
            value={action.config.forwardTo || ''}
            onChange={(e) => onConfigChange({ ...action.config, forwardTo: e.target.value })}
          />
        </div>
      )
    case 'draft':
      return (
        <div>
          <Label htmlFor="draftTemplate">Draft Template</Label>
          <Input
            id="draftTemplate"
            value={action.config.draftTemplate || ''}
            onChange={(e) => onConfigChange({ ...action.config, draftTemplate: e.target.value })}
          />
        </div>
      )
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
      )
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
      )
    default:
      return null
  }
}