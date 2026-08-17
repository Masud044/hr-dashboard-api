// src/modules/todo/route.js
import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { handleTodo, handleTodoStatus, handleReorderTodos } from "./controller.js";

const router = Router();

router.get("/",              asyncHandler(handleTodo));
router.post("/",             asyncHandler(handleTodo));
router.put("/",              asyncHandler(handleTodo));
router.patch("/reorder",     asyncHandler(handleReorderTodos));
router.patch("/:id/status",  asyncHandler(handleTodoStatus));
router.delete("/:id",        asyncHandler(handleTodo));

export default router;