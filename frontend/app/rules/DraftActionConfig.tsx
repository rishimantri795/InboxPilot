import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrashIcon } from "lucide-react";
import { toast } from "sonner";

function DraftActionConfig({ action, onConfigChange }) {
  const fileInputRef = useRef(null);
  const files = action.config.contextFiles || [];

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const updatedFiles = [...files, ...selectedFiles];
    onConfigChange({ ...action.config, contextFiles: updatedFiles });
    toast.success(`Added ${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""}`);
    e.target.value = "";
  };

  const handleRemoveFile = (index) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    onConfigChange({ ...action.config, contextFiles: updatedFiles });
  };

  return (
    <div>
      <Label htmlFor="draftTemplate">Draft Template</Label>
      <Input
        id="draftTemplate"
        value={action.config.draftTemplate || ""}
        onChange={(e) =>
          onConfigChange({ ...action.config, draftTemplate: e.target.value })
        }
        placeholder="Enter instructions for the reply draft"
      />

      <Button
        variant="outline"
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        className="mt-2"
      >
        Add Context File
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {files.length > 0 && (
        <div className="mt-2">
          <p className="text-sm text-gray-600">Files added:</p>
          <ul className="mt-1 space-y-1">
            {files.map((file, index) => (
              <li key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                <span className="text-sm">{file.name || file.fileName || "No file name"}</span>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(index)}>
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default DraftActionConfig;