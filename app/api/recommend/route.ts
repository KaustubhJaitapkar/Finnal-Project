import { NextResponse } from "next/server";

const PY_SERVICE = process.env.PY_RECOMMENDER_URL || "http://localhost:8000";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch(`${PY_SERVICE}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return NextResponse.json({ error: "Recommender error", details: err }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("/api/recommend POST error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
