import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrashIcon } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import useCurrentUser from "@/hooks/useCurrentUser";

function DraftActionConfig({ action, onConfigChange, ruleIndex }) {
  const { user } = useCurrentUser();
  const fileInputRef = useRef(null);
  const files = action.config.contextFiles || [];

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const allowedTypes = ["application/pdf"];
    const maxFileSize = 5 * 1024 * 1024;
    const MAX_FILES = 5;

    const validFiles = selectedFiles.filter((file) => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`File "${file.name}" must be a PDF.`);
        return false;
      }
      if (file.size > maxFileSize) {
        toast.error(`File "${file.name}" exceeds the 5 MB limit.`);
        return false;
      }
      return true;
    });
  
    if (validFiles.length) {
      const availableSlots = MAX_FILES - files.length;

      if (availableSlots <= 0) {
        toast.error("Maximum file limit reached. Please remove some files before adding new ones.");
        e.target.value = "";
        return;
      }

      const filesToAdd = validFiles.slice(0, availableSlots);
      if (validFiles.length > availableSlots) {
        toast.error(`Only ${availableSlots} more file(s) can be added. Some files were ignored.`);
      }
      const updatedFiles = [...files, ...filesToAdd];
      onConfigChange({ ...action.config, contextFiles: updatedFiles });
    }
    
    e.target.value = "";
  };
  

  const handleRemoveFile = async (index) => {
    const fileToRemove = action.config.contextFiles[index];
    if (!fileToRemove || !fileToRemove.s3Key) {
      const updatedFiles = action.config.contextFiles.filter((_, i) => i !== index);
      onConfigChange({ ...action.config, contextFiles: updatedFiles });
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this file? This deletion cannot be undone."
    );
    if (!confirmed) return;

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${user.id}/delete-rule-file`,
        {
          data: {
            ruleIndex,
            fileS3Key: fileToRemove.s3Key,
          },
          withCredentials: true,
        }
      );

      const updatedFiles = action.config.contextFiles.filter((_, i) => i !== index);
      onConfigChange({ ...action.config, contextFiles: updatedFiles });
      toast.success("File deleted successfully.");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Error deleting file.");
    }
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
        onClick={() => {
          fileInputRef.current && fileInputRef.current.click();
        }}
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