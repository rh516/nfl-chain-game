import "server-only";

export async function readJson(
  request: Request,
): Promise<unknown> {
  try {
    return await request.json();
  } 
  catch {
    return undefined;
  }
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return Response.json(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status },
  );
}