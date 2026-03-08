// src/utils/validation-response.ts

import { z } from "zod";

export function validationErrorResponse(error: z.ZodError): Response {
  return Response.json(
    {
      error: "Validation failed",
      details: z.treeifyError(error),
    },
    { status: 400 },
  );
}
