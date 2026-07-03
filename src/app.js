// src\app.js
import express from "express";
import cors from "cors";
import contractorRoutes from "./modules/contractor/route.js";
import projectTypeRoutes from "./modules/project-type/route.js";
import calendarRoutes from "./modules/calendar/route.js";
import ganttRoutes from "./modules/gantt/route.js";
import sheduleRoutes from "./modules/shedule/route.js";
import sheduleApiRoutes from "./modules/shedule_api/route.js";
import supplierRoutes from "./modules/supplier/route.js";
import projectRoutes from "./modules/project/route.js";
import processContractorRoutes from "./modules/process-contractor/route.js";
import scheduleHeaderRoutes from "./modules/schedule-header/route.js";
import customerRoutes from "./modules/customer/route.js";
import contractorInfoRoutes from "./modules/contractor-info/route.js";
import constructionProcessRoutes from "./modules/construction-process/route.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";
import userManagementRoutes from "./modules/user-management/user-management.routes.js";
import empImageRoutes from "./modules/employee-image/employee-image.routes.js";
import contractorTypeInfoRoutes from "./modules/contractor-type-info/route.js";
 import ownerInfoRoutes from "./modules/owner-info/route.js";
 // Barrel export — import from here in app.js / server.js
 import statementRouter from './modules/project-statement/route.js';




import authV2Route from "./modules/auth-v2/auth-v2.routes.js";
import projectNoteRoutes from "./modules/project-note/route.js";
import overviewRoutes from "./modules/overview/route.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  return next();
});


// app.use(cors({
//   origin: [
//     "http://localhost:5173",
//     "http://192.168.1.137:5174"
//   ],
//   credentials: true,
// }));
app.use(cors({
  origin: "*"
}));

app.use("/api/contractor-type", contractorRoutes);
app.use("/api/project-type", projectTypeRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/gantt", ganttRoutes);
app.use("/api/shedule", sheduleRoutes);
app.use("/api/shedule_api", sheduleApiRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/process-contractor", processContractorRoutes);
app.use("/api/schedule-header", scheduleHeaderRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/contractor", contractorInfoRoutes);
app.use("/api/construction-process", constructionProcessRoutes);

app.use("/api/emp-images", empImageRoutes);
app.use("/api/users", userManagementRoutes);
app.use('/api/statement', statementRouter);

app.use("/api/v2/auth", authV2Route);

// ─────────────────────────────────────────────────────────────────────────────
// ADD THESE TWO IMPORTS to your existing app.js imports section:
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// ADD THESE TWO LINES to your existing app.use() registrations section:
// ─────────────────────────────────────────────────────────────────────────────

app.use("/api/contractor-type-info", contractorTypeInfoRoutes);
app.use("/api/owner-info", ownerInfoRoutes);
app.use("/api/project-note", projectNoteRoutes);
app.use("/api/overview", overviewRoutes);

app.use(errorMiddleware);

export default app;
