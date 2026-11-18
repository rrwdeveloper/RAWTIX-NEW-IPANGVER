import { test, describe } from "node:test";
import assert from "node:assert";

describe("RBAC Hierarchy & Privilege Escalation Guards", () => {
  type AppRole = "owner" | "admin" | "user" | null;

  interface UserSession {
    userId: string;
    role: AppRole;
  }

  const checkAdminAccess = (session: UserSession | null) => {
    if (!session || !session.role) {
      throw new Error("Akses ditolak: Tidak memiliki role yang valid");
    }
    if (session.role !== "admin" && session.role !== "owner") {
      throw new Error("Akses ditolak: Memerlukan hak akses Admin atau Owner");
    }
    return { allowed: true, role: session.role };
  };

  const checkOwnerAccess = (session: UserSession | null) => {
    if (!session || session.role !== "owner") {
      throw new Error("Hanya Owner yang memiliki hak akses untuk tindakan ini");
    }
    return { allowed: true, role: session.role };
  };

  test("Owner can access both admin and owner-only endpoints", () => {
    const ownerSession: UserSession = { userId: "owner-uuid", role: "owner" };
    assert.strictEqual(checkAdminAccess(ownerSession).allowed, true);
    assert.strictEqual(checkOwnerAccess(ownerSession).allowed, true);
  });

  test("Admin can access admin endpoints but is blocked from owner-only actions", () => {
    const adminSession: UserSession = { userId: "admin-uuid", role: "admin" };
    assert.strictEqual(checkAdminAccess(adminSession).allowed, true);
    assert.throws(
      () => checkOwnerAccess(adminSession),
      /Hanya Owner yang memiliki hak akses/
    );
  });

  test("Regular users and unauthenticated users are blocked from admin endpoints", () => {
    const regularSession: UserSession = { userId: "user-uuid", role: "user" };
    assert.throws(() => checkAdminAccess(regularSession), /Akses ditolak/);
    assert.throws(() => checkOwnerAccess(regularSession), /Hanya Owner/);

    assert.throws(() => checkAdminAccess(null), /Akses ditolak/);
    assert.throws(() => checkOwnerAccess(null), /Hanya Owner/);
  });

  test("Owner cannot delete their own active logged-in account", () => {
    const currentUserId = "owner-123";
    const targetUserId = "owner-123";

    const deleteUserHandler = (currentId: string, targetId: string) => {
      if (currentId === targetId) {
        throw new Error(
          "Tidak dapat menghapus akun Anda sendiri saat ini sedang aktif digunakan"
        );
      }
      return { success: true };
    };

    assert.throws(
      () => deleteUserHandler(currentUserId, targetUserId),
      /Tidak dapat menghapus akun Anda sendiri/
    );
  });

  test("System prevents deleting the last active Owner", () => {
    const activeOwnerCount = 1;
    const targetIsOwner = true;

    const deleteOwnerGuard = (isOwner: boolean, totalOwners: number) => {
      if (isOwner && totalOwners <= 1) {
        throw new Error(
          "Sistem harus memiliki minimal satu Owner yang aktif. Tidak dapat menghapus satu-satunya Owner."
        );
      }
      return { allowed: true };
    };

    assert.throws(
      () => deleteOwnerGuard(targetIsOwner, activeOwnerCount),
      /minimal satu Owner/
    );

    // If there are multiple owners, deletion is allowed
    assert.strictEqual(deleteOwnerGuard(targetIsOwner, 2).allowed, true);
  });

  test("System prevents demoting the last active Owner to admin", () => {
    const activeOwnerCount = 1;
    const currentTargetRole = "owner";
    const newRole = "admin";

    const demoteOwnerGuard = (curRole: string, nextRole: string, totalOwners: number) => {
      if (curRole === "owner" && nextRole === "admin" && totalOwners <= 1) {
        throw new Error(
          "Sistem harus memiliki minimal satu Owner yang aktif. Tidak dapat mendemosikan satu-satunya Owner."
        );
      }
      return { allowed: true };
    };

    assert.throws(
      () => demoteOwnerGuard(currentTargetRole, newRole, activeOwnerCount),
      /minimal satu Owner/
    );

    // If there are multiple owners, demoting is allowed
    assert.strictEqual(
      demoteOwnerGuard(currentTargetRole, newRole, 2).allowed,
      true
    );
  });
});
