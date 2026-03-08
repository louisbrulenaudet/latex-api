// src/controllers/latex-controller.ts

import type { Context } from "hono";
import {
  CompileLatexRequestSchema,
  CompileLatexZipRequestSchema,
} from "../dtos/latex";
import { CompileMode } from "../enums/compile-mode";
import { Errors } from "../enums/errors";
import type { LatexService } from "../services/latex-service";
import { createPdfResponse } from "../utils/pdf-response";
import { validationErrorResponse } from "../utils/validation-response";

type CompileVariables = { compileMode: CompileMode };
type CompileContext = Context<{ Variables: CompileVariables }>;

export class LatexController {
  private readonly latexService: LatexService;

  constructor(latexService: LatexService) {
    this.latexService = latexService;
  }

  /**
   * Handle the compile request.
   *
   * @param c - The compile context.
   * @returns The compile response.
   */
  async handleCompile(c: CompileContext) {
    const compileMode = c.get("compileMode");
    return compileMode === CompileMode.JSON
      ? this.handleJsonCompile(c)
      : this.handleZipCompile(c);
  }

  /**
   * Handle the JSON compile request.
   *
   * @param c - The compile context.
   * @returns The compile response.
   */
  private async handleJsonCompile(c: CompileContext) {
    const result = CompileLatexRequestSchema.safeParse(await c.req.json());
    if (!result.success) {
      return validationErrorResponse(result.error);
    }
    const data = result.data;
    const { pdf, uuid } = await this.latexService.compile(data.content, {
      timeoutMs: data.timeout,
      runTwice: data.runTwice,
      engine: data.engine,
    });
    return createPdfResponse(pdf, uuid);
  }

  /**
   * Handle the ZIP compile request.
   *
   * @param c - The compile context.
   * @returns The compile response.
   */
  private async handleZipCompile(c: CompileContext) {
    const form = await c.req.parseBody();
    const file = form.file;
    if (!file || !(file instanceof File)) {
      return c.json({ error: "ZIP file is required (field: file)" }, 400);
    }
    const zipResult = CompileLatexZipRequestSchema.safeParse(form);
    if (!zipResult.success) {
      return validationErrorResponse(zipResult.error);
    }
    const { entry_file, timeout, runTwice, engine } = zipResult.data;
    let zipBuffer: Buffer;
    try {
      zipBuffer = Buffer.from(await file.arrayBuffer());
    } catch {
      return c.json(
        {
          error: "Invalid or corrupted ZIP file",
          code: Errors.LATEX_INVALID_ZIP,
        },
        400,
      );
    }
    const { pdf, uuid } = await this.latexService.compileFromZip(
      zipBuffer,
      entry_file,
      { timeoutMs: timeout, runTwice, engine },
    );
    return createPdfResponse(pdf, uuid);
  }
}
