// src/routes/latex.ts

import { Hono } from "hono";
import { LatexController } from "../controllers/latex-controller";
import type { CompileMode } from "../enums/compile-mode";
import { requireCompileContentType } from "../middlewares/compile-content-type";
import { LatexService } from "../services/latex-service";

type CompileVariables = { compileMode: CompileMode };

const router = new Hono<{ Variables: CompileVariables }>();
const latexService = new LatexService();
const controller = new LatexController(latexService);

router.post("/compile", requireCompileContentType(), (c) =>
  controller.handleCompile(c),
);

export default router;
export type LatexRoute = typeof router;
