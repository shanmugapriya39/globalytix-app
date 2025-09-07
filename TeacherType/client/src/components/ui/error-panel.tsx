import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorPanelProps {
  message: string;
  onDismiss: () => void;
  className?: string;
}

export function ErrorPanel({ message, onDismiss, className }: ErrorPanelProps) {
  return (
    <div className={cn("bg-red-50 border border-red-200 rounded-lg p-4", className)}>
      <div className="flex items-center">
        <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="text-sm text-red-700 mt-1" data-testid="text-error-message">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="ml-auto text-red-500 hover:text-red-700"
          data-testid="button-dismiss-error"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
