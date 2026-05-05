import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

describe("useAuth", () => {
  const push = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push });
  });

  afterEach(() => {
    cleanup();
  });

  test("exposes signIn, signUp, and isLoading=false initially", () => {
    const { result } = renderHook(() => useAuth());

    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    test("returns the action result on success and navigates after post-sign-in", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([{ id: "proj-1" }]);

      const { result } = renderHook(() => useAuth());

      let returned: any;
      await act(async () => {
        returned = await result.current.signIn("a@b.com", "password123");
      });

      expect(signInAction).toHaveBeenCalledWith("a@b.com", "password123");
      expect(returned).toEqual({ success: true });
      expect(push).toHaveBeenCalledWith("/proj-1");
    });

    test("returns the action result on failure and does not navigate", async () => {
      (signInAction as any).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      let returned: any;
      await act(async () => {
        returned = await result.current.signIn("a@b.com", "wrong");
      });

      expect(returned).toEqual({ success: false, error: "Invalid credentials" });
      expect(getAnonWorkData).not.toHaveBeenCalled();
      expect(getProjects).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
    });

    test("toggles isLoading true during the call and false after success", async () => {
      let resolveAction: (v: any) => void = () => {};
      (signInAction as any).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveAction = resolve;
          })
      );
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([{ id: "proj-1" }]);

      const { result } = renderHook(() => useAuth());

      let signInPromise: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("a@b.com", "password123");
      });

      await waitFor(() => expect(result.current.isLoading).toBe(true));

      await act(async () => {
        resolveAction({ success: true });
        await signInPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading even if the action throws", async () => {
      (signInAction as any).mockRejectedValue(new Error("network down"));

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signIn("a@b.com", "password123");
        })
      ).rejects.toThrow("network down");

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("returns the action result on success and navigates after post-sign-in", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockResolvedValue({ id: "new-proj" });

      const { result } = renderHook(() => useAuth());

      let returned: any;
      await act(async () => {
        returned = await result.current.signUp("a@b.com", "password123");
      });

      expect(signUpAction).toHaveBeenCalledWith("a@b.com", "password123");
      expect(returned).toEqual({ success: true });
      expect(push).toHaveBeenCalledWith("/new-proj");
    });

    test("returns the action result on failure and does not navigate", async () => {
      (signUpAction as any).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      let returned: any;
      await act(async () => {
        returned = await result.current.signUp("a@b.com", "password123");
      });

      expect(returned).toEqual({
        success: false,
        error: "Email already registered",
      });
      expect(push).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
    });

    test("resets isLoading even if the action throws", async () => {
      (signUpAction as any).mockRejectedValue(new Error("boom"));

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signUp("a@b.com", "password123");
        })
      ).rejects.toThrow("boom");

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("post sign-in navigation (handlePostSignIn)", () => {
    test("with anonymous work: creates a project from the anon data, clears it, and navigates", async () => {
      const anonMessages = [{ role: "user", content: "hi" }];
      const anonFsData = { "/": { type: "directory" } };

      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue({
        messages: anonMessages,
        fileSystemData: anonFsData,
      });
      (createProject as any).mockResolvedValue({ id: "anon-proj" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "password123");
      });

      expect(createProject).toHaveBeenCalledTimes(1);
      const arg = (createProject as any).mock.calls[0][0];
      expect(arg.messages).toBe(anonMessages);
      expect(arg.data).toBe(anonFsData);
      expect(typeof arg.name).toBe("string");
      expect(arg.name).toMatch(/^Design from /);

      expect(clearAnonWork).toHaveBeenCalledTimes(1);
      expect(getProjects).not.toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith("/anon-proj");
    });

    test("with anon-work record but empty messages: falls through to existing-projects branch", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      (getProjects as any).mockResolvedValue([
        { id: "recent" },
        { id: "older" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "password123");
      });

      expect(createProject).not.toHaveBeenCalled();
      expect(clearAnonWork).not.toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith("/recent");
    });

    test("with no anon work and existing projects: navigates to the first project", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([
        { id: "first" },
        { id: "second" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "password123");
      });

      expect(createProject).not.toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith("/first");
      expect(push).toHaveBeenCalledTimes(1);
    });

    test("with no anon work and no projects: creates a new empty project and navigates", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockResolvedValue({ id: "fresh" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "password123");
      });

      expect(createProject).toHaveBeenCalledTimes(1);
      const arg = (createProject as any).mock.calls[0][0];
      expect(arg.messages).toEqual([]);
      expect(arg.data).toEqual({});
      expect(arg.name).toMatch(/^New Design #\d+$/);

      expect(push).toHaveBeenCalledWith("/fresh");
      expect(clearAnonWork).not.toHaveBeenCalled();
    });

    test("propagates createProject errors and still resets isLoading", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockRejectedValue(new Error("db unavailable"));

      const { result } = renderHook(() => useAuth());

      await expect(
        act(async () => {
          await result.current.signIn("a@b.com", "password123");
        })
      ).rejects.toThrow("db unavailable");

      expect(push).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
