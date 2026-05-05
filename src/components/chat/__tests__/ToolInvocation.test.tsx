import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocation, getToolLabel } from "../ToolInvocation";

afterEach(() => {
  cleanup();
});

// --- getToolLabel: pure label logic ---

test("getToolLabel: str_replace_editor create → 'Creating <file>'", () => {
  expect(
    getToolLabel("str_replace_editor", {
      command: "create",
      path: "/components/Card.jsx",
    })
  ).toBe("Creating Card.jsx");
});

test("getToolLabel: str_replace_editor str_replace → 'Editing <file>'", () => {
  expect(
    getToolLabel("str_replace_editor", {
      command: "str_replace",
      path: "/App.jsx",
    })
  ).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor insert → 'Editing <file>'", () => {
  expect(
    getToolLabel("str_replace_editor", {
      command: "insert",
      path: "/App.jsx",
    })
  ).toBe("Editing App.jsx");
});

test("getToolLabel: str_replace_editor view → 'Viewing <file>'", () => {
  expect(
    getToolLabel("str_replace_editor", {
      command: "view",
      path: "/App.jsx",
    })
  ).toBe("Viewing App.jsx");
});

test("getToolLabel: str_replace_editor undo_edit → 'Undoing edit to <file>'", () => {
  expect(
    getToolLabel("str_replace_editor", {
      command: "undo_edit",
      path: "/App.jsx",
    })
  ).toBe("Undoing edit to App.jsx");
});

test("getToolLabel: file_manager rename → 'Renaming <old> to <new>'", () => {
  expect(
    getToolLabel("file_manager", {
      command: "rename",
      path: "/old.jsx",
      new_path: "/components/new.jsx",
    })
  ).toBe("Renaming old.jsx to new.jsx");
});

test("getToolLabel: file_manager delete → 'Deleting <file>'", () => {
  expect(
    getToolLabel("file_manager", {
      command: "delete",
      path: "/App.jsx",
    })
  ).toBe("Deleting App.jsx");
});

test("getToolLabel: unknown tool falls back to raw tool name", () => {
  expect(
    getToolLabel("some_other_tool", { command: "create", path: "/x.jsx" })
  ).toBe("some_other_tool");
});

test("getToolLabel: empty args falls back to raw tool name", () => {
  expect(getToolLabel("str_replace_editor", {})).toBe("str_replace_editor");
});

test("getToolLabel: missing path falls back to raw tool name", () => {
  expect(
    getToolLabel("str_replace_editor", { command: "create" })
  ).toBe("str_replace_editor");
});

test("getToolLabel: deeply nested path uses last segment", () => {
  expect(
    getToolLabel("str_replace_editor", {
      command: "create",
      path: "/src/components/ui/Button.tsx",
    })
  ).toBe("Creating Button.tsx");
});

// --- ToolInvocation rendering ---

test("ToolInvocation renders friendly label for create", () => {
  render(
    <ToolInvocation
      tool={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/components/Card.jsx" },
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("Creating Card.jsx")).toBeDefined();
});

test("ToolInvocation renders friendly label for delete", () => {
  render(
    <ToolInvocation
      tool={{
        toolCallId: "2",
        toolName: "file_manager",
        args: { command: "delete", path: "/App.jsx" },
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("Deleting App.jsx")).toBeDefined();
});

test("ToolInvocation renders spinner while in 'call' state", () => {
  const { container } = render(
    <ToolInvocation
      tool={{
        toolCallId: "3",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "call",
      }}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  // No green dot in call state.
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolInvocation renders green dot when state is 'result' with a result", () => {
  const { container } = render(
    <ToolInvocation
      tool={{
        toolCallId: "4",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolInvocation falls back to raw tool name when args are empty", () => {
  render(
    <ToolInvocation
      tool={{
        toolCallId: "5",
        toolName: "str_replace_editor",
        args: {},
        state: "result",
        result: "ok",
      }}
    />
  );
  expect(screen.getByText("str_replace_editor")).toBeDefined();
});
