// src/dtos/latex.ts

import { z } from "zod";
import { LatexEngine } from "../enums/latex-engine";

export const CompileLatexRequestSchema = z.object({
  content: z.string(),
  timeout: z.number().int().min(1000).max(120_000).default(30_000),
  runTwice: z.boolean().optional().default(false),
  engine: z.enum(LatexEngine).optional().default(LatexEngine.PDFLATEX),
});

export const CompileLatexResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const CompileLatexZipRequestSchema = z.object({
  entry_file: z
    .string()
    .min(1, "entry_file is required")
    .refine((s) => s.toLowerCase().endsWith(".tex"), {
      message: "entry_file must be a .tex file",
    }),
  timeout: z
    .union([z.number().int(), z.string(), z.undefined()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") {
        return 30_000;
      }
      return typeof v === "string" ? Number.parseInt(v, 10) : v;
    })
    .pipe(z.number().int().min(1000).max(120_000)),
  runTwice: z
    .union([z.boolean(), z.string(), z.undefined()])
    .optional()
    .transform((v) => v === true || v === "true" || v === "1"),
  engine: z
    .union([z.enum(LatexEngine), z.string(), z.undefined()])
    .optional()
    .transform((v) => {
      if (v === LatexEngine.XELATEX) {
        return LatexEngine.XELATEX;
      }
      return LatexEngine.PDFLATEX;
    }),
});

export type CompileLatexRequest = z.infer<typeof CompileLatexRequestSchema>;
export type CompileLatexResponse = z.infer<typeof CompileLatexResponseSchema>;
export type CompileLatexZipRequest = z.infer<
  typeof CompileLatexZipRequestSchema
>;
