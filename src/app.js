import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config.js";

import userRouters from "./routes/user.routes.js";
import serviceRouters from "./routes/service.routes.js";
import contactRouters from "./routes/contact.routes.js";
import careerRouters from "./routes/career.routes.js";
import applicationRouters from "./routes/application.routes.js";
import projectRouters from "./routes/project.routes.js";
import commonRouters from "./routes/common.routes.js";

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://pipecraft.biswajitpodili.dev/",
    credentials: true,
  })
);
app.use(
  express.json({
    limit: "16kb",
  })
);
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());


app.use("/api", commonRouters);
app.use("/api/users", userRouters);
app.use("/api/services", serviceRouters);
app.use("/api/contacts", contactRouters);
app.use("/api/careers", careerRouters);
app.use("/api/applications", applicationRouters);
app.use("/api/projects", projectRouters);

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.status) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      errors: err.error || [],
      data: null,
    });
  }
  res.status(500).json({
    success: false,
    message: err || "Internal server error",
    errors: [],
    data: null,
  });
});

export { app };
