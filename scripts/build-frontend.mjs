import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), "..");
const outputDir = path.join(rootDir, "frontend", "admin", "site");
const buildVersion = Date.now().toString();

const files = [
  ["mainpage.html", "index.html"],
  ["EventAdminDashboard.html", "dashboard.html"],
  ["EventAdminEvents.html", "events.html"],
  ["EventAdminAttendeeInsights.html", "attendee-insights.html"],
  ["EventAdminHelp.html", "help.html"],
  ["EventAdminSettings.html", "settings.html"],
  ["TeacherPortalDashboard.html", "teacher-dashboard.html"],
  ["TeacherPortalMyEvents.html", "teacher-my-events.html"],
  ["TeacherPortalBrowseEvents.html", "teacher-browse-events.html"],
  ["TeacherPortalEventDetail.html", "teacher-event-detail.html"],
  ["TeacherPortalStudents.html", "teacher-students.html"],
  ["TeacherPortalAttendance.html", "teacher-attendance.html"],
  ["TeacherPortalProfile.html", "teacher-profile.html"],
  ["TeacherPortalSettings.html", "teacher-settings.html"],
  ["StudentPortalDashboard.html", "student-dashboard.html"],
  ["StudentPortalBrowseEvents.html", "student-browse-events.html"],
  ["StudentPortalRegistrations.html", "student-registrations.html"],
  ["StudentPortalAttendance.html", "student-attendance.html"],
  ["StudentPortalProfile.html", "student-profile.html"],
  ["auth-page.js", "auth-page.js"],
  ["dashboard-page.js", "dashboard-page.js"],
  ["events-page.js", "events-page.js"],
  ["attendee-insights-page.js", "attendee-insights-page.js"],
  ["help-page.js", "help-page.js"],
  ["settings-page.js", "settings-page.js"],
  ["teacher-dashboard-page.js", "teacher-dashboard-page.js"],
  ["teacher-my-events-page.js", "teacher-my-events-page.js"],
  ["teacher-browse-events-page.js", "teacher-browse-events-page.js"],
  ["teacher-event-detail-page.js", "teacher-event-detail-page.js"],
  ["teacher-students-page.js", "teacher-students-page.js"],
  ["teacher-attendance-page.js", "teacher-attendance-page.js"],
  ["teacher-profile-page.js", "teacher-profile-page.js"],
  ["teacher-settings-page.js", "teacher-settings-page.js"],
  ["student-dashboard-page.js", "student-dashboard-page.js"],
  ["student-browse-events-page.js", "student-browse-events-page.js"],
  ["student-registrations-page.js", "student-registrations-page.js"],
  ["student-attendance-page.js", "student-attendance-page.js"],
  ["student-profile-page.js", "student-profile-page.js"],
  ["teacher-portal.css", "teacher-portal.css"],
  ["teacher-shared.js", "teacher-shared.js"],
  ["student-shared.js", "student-shared.js"],
  ["ems-realtime.js", "ems-realtime.js"],
  ["ems-config.js", "ems-config.js"]
];

await mkdir(outputDir, { recursive: true });

await Promise.all(
  files.map(async ([sourceName, outputName]) => {
    await copyFile(path.join(rootDir, sourceName), path.join(outputDir, outputName));
  })
);

for (const htmlName of ["index.html", "dashboard.html", "events.html", "attendee-insights.html", "help.html", "settings.html", "teacher-dashboard.html", "teacher-my-events.html", "teacher-browse-events.html", "teacher-event-detail.html", "teacher-students.html", "teacher-attendance.html", "teacher-profile.html", "teacher-settings.html", "student-dashboard.html", "student-browse-events.html", "student-registrations.html", "student-attendance.html", "student-profile.html"]) {
  const htmlPath = path.join(outputDir, htmlName);
  const html = await readFile(htmlPath, "utf8");
  const updatedHtml = html
    .replace("./ems-config.js", `./ems-config.js?v=${buildVersion}`)
    .replace("./auth-page.js", `./auth-page.js?v=${buildVersion}`)
    .replace("./dashboard-page.js", `./dashboard-page.js?v=${buildVersion}`)
    .replace("./events-page.js", `./events-page.js?v=${buildVersion}`)
    .replace("./attendee-insights-page.js", `./attendee-insights-page.js?v=${buildVersion}`)
    .replace("./help-page.js", `./help-page.js?v=${buildVersion}`)
    .replace("./settings-page.js", `./settings-page.js?v=${buildVersion}`)
    .replace("./teacher-dashboard-page.js", `./teacher-dashboard-page.js?v=${buildVersion}`)
    .replace("./teacher-my-events-page.js", `./teacher-my-events-page.js?v=${buildVersion}`)
    .replace("./teacher-browse-events-page.js", `./teacher-browse-events-page.js?v=${buildVersion}`)
    .replace("./teacher-event-detail-page.js", `./teacher-event-detail-page.js?v=${buildVersion}`)
    .replace("./teacher-students-page.js", `./teacher-students-page.js?v=${buildVersion}`)
    .replace("./teacher-attendance-page.js", `./teacher-attendance-page.js?v=${buildVersion}`)
    .replace("./teacher-profile-page.js", `./teacher-profile-page.js?v=${buildVersion}`)
    .replace("./teacher-settings-page.js", `./teacher-settings-page.js?v=${buildVersion}`)
    .replace("./student-dashboard-page.js", `./student-dashboard-page.js?v=${buildVersion}`)
    .replace("./student-browse-events-page.js", `./student-browse-events-page.js?v=${buildVersion}`)
    .replace("./student-registrations-page.js", `./student-registrations-page.js?v=${buildVersion}`)
    .replace("./student-attendance-page.js", `./student-attendance-page.js?v=${buildVersion}`)
    .replace("./student-profile-page.js", `./student-profile-page.js?v=${buildVersion}`)
    .replace("./teacher-portal.css", `./teacher-portal.css?v=${buildVersion}`)
    .replace("./teacher-shared.js", `./teacher-shared.js?v=${buildVersion}`)
    .replace("./student-shared.js", `./student-shared.js?v=${buildVersion}`)
    .replace("./ems-realtime.js", `./ems-realtime.js?v=${buildVersion}`);

  await writeFile(htmlPath, updatedHtml);
}

console.log(`Admin frontend prepared in ${outputDir}`);
