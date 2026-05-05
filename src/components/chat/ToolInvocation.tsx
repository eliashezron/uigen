import { Loader2 } from "lucide-react";
import type { Message } from "ai";

type ToolInvocationPart = Extract<
  NonNullable<Message["parts"]>[number],
  { type: "tool-invocation" }
>;

type ToolInvocationData = ToolInvocationPart["toolInvocation"];

interface ToolInvocationProps {
  tool: ToolInvocationData;
}

function extractFileName(path: unknown): string | null {
  if (typeof path !== "string" || path.length === 0) return null;
  const segments = path.split("/").filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : path;
}

export function getToolLabel(toolName: string, args: any): string {
  const fileName = extractFileName(args?.path);

  if (toolName === "str_replace_editor" && args?.command && fileName) {
    switch (args.command) {
      case "create":
        return `Creating ${fileName}`;
      case "str_replace":
      case "insert":
        return `Editing ${fileName}`;
      case "view":
        return `Viewing ${fileName}`;
      case "undo_edit":
        return `Undoing edit to ${fileName}`;
    }
  }

  if (toolName === "file_manager" && args?.command && fileName) {
    switch (args.command) {
      case "rename": {
        const newName = extractFileName(args.new_path);
        return newName
          ? `Renaming ${fileName} to ${newName}`
          : `Renaming ${fileName}`;
      }
      case "delete":
        return `Deleting ${fileName}`;
    }
  }

  return toolName;
}

export function ToolInvocation({ tool }: ToolInvocationProps) {
  const label = getToolLabel(tool.toolName, tool.args);
  const isComplete = tool.state === "result" && (tool as any).result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
