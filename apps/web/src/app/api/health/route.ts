import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "nfl-chain-web",
    status: "ok",
  });
}
