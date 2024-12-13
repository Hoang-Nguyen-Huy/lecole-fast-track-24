import express from "express";
import todosController from "../controllers/todos.controller.js";

const router = express.Router();

router.get("/api/todos", todosController.getAll);
router.post("/api/todos", todosController.create);

export default (app) => {
  app.use(router);
};
