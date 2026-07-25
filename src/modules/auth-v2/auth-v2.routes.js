// src/modules/auth-v2/auth-v2.routes.js
import express from "express";
import { loginV2, logoutV2, registerV2 } from "./auth-v2.controller.js";
import { protectRouteV2 } from "./auth-v2.middleware.js";

const router = express.Router();

router.post("/register", registerV2);
router.post("/login",    loginV2);
router.post("/logout",   logoutV2);

router.get("/me", protectRouteV2, (req, res) => {
  return res.json({
    status: "success",
    data: {
      user: {
        id:          req.user.id,
        username:    req.user.username,
        userType:    req.user.userType,
        refId:       req.user.refId,
        roles:       req.user.roles,
        permissions: req.user.permissions,
      },
    },
  });
});

export default router;