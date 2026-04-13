"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPortalConfig = getPortalConfig;
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
};
function getPortalConfig(role) {
    return portalConfig[role];
}
