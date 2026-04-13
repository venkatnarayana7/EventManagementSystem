"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const path = __importStar(require("node:path"));
const serializers_1 = require("../../shared/src/serializers");
const security_1 = require("./security");
const port = Number(process.env.PORT ?? 3000);
const workspaceRoot = path.resolve(__dirname, "../../../../");
const backendRoot = path.resolve(__dirname, "../../../");
const authPagePath = path.join(workspaceRoot, "mainpage.html");
const dashboardPagePath = path.join(workspaceRoot, "EventAdminDashboard.html");
const authScriptPath = path.join(workspaceRoot, "auth-page.js");
const dashboardScriptPath = path.join(workspaceRoot, "dashboard-page.js");
const configScriptPath = path.join(workspaceRoot, "ems-config.js");
const usersFilePath = path.join(backendRoot, "server/data/local-users.json");
const allowedOrigins = (process.env.EMS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
const cookieSameSite = (process.env.EMS_COOKIE_SAME_SITE ?? "Lax").trim();
const cookieSecure = process.env.EMS_COOKIE_SECURE === "true" || cookieSameSite.toLowerCase() === "none";
const cookieDomain = process.env.EMS_COOKIE_DOMAIN?.trim();
const dashboardRoute = "/dashboard.html";
function sendJson(res, statusCode, body, headers = {}) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json",
        ...headers
    });
    res.end(JSON.stringify(body));
}
function sendHtml(res, html) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
}
function sendScript(res, script) {
    res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
    res.end(script);
}
function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => {
            data += chunk;
        });
        req.on("end", () => {
            if (!data) {
                resolve({});
                return;
            }
            try {
                resolve(JSON.parse(data));
            }
            catch (error) {
                reject(error);
            }
        });
        req.on("error", reject);
    });
}
function normalizeRole(role) {
    const normalized = String(role ?? "").trim().toLowerCase();
    if (normalized === "admin" || normalized === "teacher" || normalized === "student") {
        return normalized;
    }
    return null;
}
function parseCookies(req) {
    const cookieHeader = req.headers.cookie ?? "";
    return cookieHeader.split(";").reduce((accumulator, part) => {
        const [rawName, ...rawValue] = part.trim().split("=");
        if (!rawName) {
            return accumulator;
        }
        accumulator[rawName] = rawValue.join("=");
        return accumulator;
    }, {});
}
function setSessionCookie(res, token) {
    const attributes = [
        `ems_session=${token}`,
        "Path=/",
        "HttpOnly",
        `SameSite=${cookieSameSite}`,
        `Max-Age=${60 * 60 * 12}`
    ];
    if (cookieSecure) {
        attributes.push("Secure");
    }
    if (cookieDomain) {
        attributes.push(`Domain=${cookieDomain}`);
    }
    res.setHeader("Set-Cookie", attributes.join("; "));
}
function clearSessionCookie(res) {
    const attributes = ["ems_session=", "Path=/", "HttpOnly", `SameSite=${cookieSameSite}`, "Max-Age=0"];
    if (cookieSecure) {
        attributes.push("Secure");
    }
    if (cookieDomain) {
        attributes.push(`Domain=${cookieDomain}`);
    }
    res.setHeader("Set-Cookie", attributes.join("; "));
}
async function getCurrentUser(req) {
    const cookies = parseCookies(req);
    const token = cookies.ems_session;
    if (!token) {
        return null;
    }
    const session = (0, security_1.verifySessionToken)(token);
    if (!session?.sub) {
        return null;
    }
    const users = await readUsers();
    return users.find((user) => user.id === session.sub) ?? null;
}
async function readUsers() {
    try {
        const raw = await (0, promises_1.readFile)(usersFilePath, "utf8");
        return JSON.parse(raw);
    }
    catch {
        return [];
    }
}
async function writeUsers(users) {
    await (0, promises_1.writeFile)(usersFilePath, JSON.stringify(users, null, 2));
}
function getCorsHeaders(req) {
    const origin = req.headers.origin;
    if (!origin || !allowedOrigins.includes(origin)) {
        return {};
    }
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        Vary: "Origin"
    };
}
function buildDashboardSummary(users) {
    const metrics = users.reduce((accumulator, user) => {
        accumulator.totalAccounts += 1;
        accumulator[user.role] += 1;
        return accumulator;
    }, {
        totalAccounts: 0,
        admin: 0,
        teacher: 0,
        student: 0
    });
    const recentUsers = [...users]
        .reverse()
        .slice(0, 5)
        .map((user) => ({
        id: user.id,
        fullName: user.full_name,
        role: user.role,
        createdAt: user.created_at ?? null
    }));
    return {
        metrics: {
            totalAccounts: metrics.totalAccounts,
            admins: metrics.admin,
            teachers: metrics.teacher,
            students: metrics.student
        },
        recentUsers
    };
}
async function serveHtmlFile(res, filePath) {
    const html = await (0, promises_1.readFile)(filePath, "utf8");
    sendHtml(res, html);
}
async function serveScriptFile(res, filePath) {
    const script = await (0, promises_1.readFile)(filePath, "utf8");
    sendScript(res, script);
}
const server = (0, node_http_1.createServer)(async (req, res) => {
    try {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
        const corsHeaders = getCorsHeaders(req);
        if (req.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
            res.writeHead(204, {
                ...corsHeaders,
                "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400"
            });
            res.end();
            return;
        }
        if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html" || url.pathname === "/mainpage.html")) {
            await serveHtmlFile(res, authPagePath);
            return;
        }
        if (req.method === "GET" && (url.pathname === dashboardRoute || url.pathname === "/dashboard" || url.pathname === "/EventAdminDashboard.html")) {
            await serveHtmlFile(res, dashboardPagePath);
            return;
        }
        if (req.method === "GET" && url.pathname === "/auth-page.js") {
            await serveScriptFile(res, authScriptPath);
            return;
        }
        if (req.method === "GET" && url.pathname === "/dashboard-page.js") {
            await serveScriptFile(res, dashboardScriptPath);
            return;
        }
        if (req.method === "GET" && url.pathname === "/ems-config.js") {
            await serveScriptFile(res, configScriptPath);
            return;
        }
        if (req.method === "GET" && url.pathname === "/health") {
            sendJson(res, 200, { ok: true }, corsHeaders);
            return;
        }
        if (req.method === "GET" && url.pathname === "/api/auth/me") {
            const currentUser = await getCurrentUser(req);
            if (!currentUser) {
                sendJson(res, 401, { message: "Not signed in" }, corsHeaders);
                return;
            }
            sendJson(res, 200, { user: (0, serializers_1.serializeUser)(currentUser), redirectTo: dashboardRoute }, corsHeaders);
            return;
        }
        if (req.method === "GET" && url.pathname === "/api/dashboard/summary") {
            const currentUser = await getCurrentUser(req);
            if (!currentUser) {
                sendJson(res, 401, { message: "Not signed in" }, corsHeaders);
                return;
            }
            const users = await readUsers();
            sendJson(res, 200, buildDashboardSummary(users), corsHeaders);
            return;
        }
        if (req.method === "POST" && url.pathname === "/api/auth/signup") {
            const body = await readBody(req);
            const role = normalizeRole(body.role);
            const fullName = String(body.fullName ?? "").trim();
            const email = String(body.email ?? "").trim().toLowerCase();
            const password = String(body.password ?? "");
            if (!role) {
                sendJson(res, 400, { message: "Choose a valid role" }, corsHeaders);
                return;
            }
            if (!fullName || !email || !password) {
                sendJson(res, 400, { message: "Full name, email, and password are required" }, corsHeaders);
                return;
            }
            if (password.length < 8) {
                sendJson(res, 400, { message: "Password must be at least 8 characters" }, corsHeaders);
                return;
            }
            const users = await readUsers();
            if (users.some((user) => user.email === email)) {
                sendJson(res, 409, { message: "An account with this email already exists" }, corsHeaders);
                return;
            }
            const user = {
                id: (0, node_crypto_1.randomUUID)(),
                email,
                full_name: fullName,
                role,
                department: null,
                avatar_url: null,
                password_hash: (0, security_1.hashPassword)(password),
                created_at: new Date().toISOString()
            };
            users.push(user);
            await writeUsers(users);
            const token = (0, security_1.createSessionToken)({
                sub: user.id,
                role: user.role
            });
            setSessionCookie(res, token);
            sendJson(res, 201, { user: (0, serializers_1.serializeUser)(user), redirectTo: dashboardRoute }, corsHeaders);
            return;
        }
        if (req.method === "POST" && url.pathname === "/api/auth/login") {
            const body = await readBody(req);
            const role = normalizeRole(body.role);
            const email = String(body.email ?? "").trim().toLowerCase();
            const password = String(body.password ?? "");
            if (!role || !email || !password) {
                sendJson(res, 400, { message: "Email, password, and role are required" }, corsHeaders);
                return;
            }
            const users = await readUsers();
            const user = users.find((candidate) => candidate.email === email) ?? null;
            if (!user || user.role !== role || !user.password_hash || !(0, security_1.verifyPassword)(password, user.password_hash)) {
                sendJson(res, 401, { message: "Invalid credentials" }, corsHeaders);
                return;
            }
            const token = (0, security_1.createSessionToken)({
                sub: user.id,
                role: user.role
            });
            setSessionCookie(res, token);
            sendJson(res, 200, {
                user: (0, serializers_1.serializeUser)(user),
                redirectTo: dashboardRoute
            }, corsHeaders);
            return;
        }
        if (req.method === "POST" && url.pathname === "/api/auth/logout") {
            clearSessionCookie(res);
            sendJson(res, 200, { message: "Signed out" }, corsHeaders);
            return;
        }
        sendJson(res, 404, { message: "Not found" }, corsHeaders);
    }
    catch (error) {
        sendJson(res, 500, {
            message: error instanceof Error ? error.message : "Unexpected server error"
        });
    }
});
server.listen(port, () => {
    console.log(`EMS local auth UI server running at http://localhost:${port}`);
});
