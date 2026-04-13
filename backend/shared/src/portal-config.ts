import type { AppRole } from "./auth";

const portalConfig = {
  admin: {
    layout: "AdminLayout",
    defaultRoute: "/admin/dashboard",
    tabs: ["Dashboard", "Events", "Approvals"]
  },
  teacher: {
    layout: "TeacherLayout",
    defaultRoute: "/teacher/my-events",
    tabs: ["My Events", "Attendance", "Feedback"]
  },
  student: {
    layout: "StudentLayout",
    defaultRoute: "/student/discover",
    tabs: ["Discover", "My Registrations"]
  }
} as const;

export function getPortalConfig(role: AppRole) {
  return portalConfig[role];
}

