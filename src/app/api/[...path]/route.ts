import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JSON_SERVER_URL = process.env.JSON_SERVER_URL ?? "http://localhost:3001";

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const resolvedSegments = [...pathSegments];
  if (resolvedSegments[0] === "deliveryStaff") {
    resolvedSegments[0] = "staff";
  }
  let targetUrl = new URL(`${JSON_SERVER_URL}/${resolvedSegments.join("/")}`);

  const searchParams = new URLSearchParams(request.nextUrl.searchParams);
  const queryId = searchParams.get("_id");

  if (
    queryId &&
    resolvedSegments.length === 1 &&
    ["PATCH", "PUT", "DELETE"].includes(request.method)
  ) {
    const lookupUrl = new URL(`${JSON_SERVER_URL}/${resolvedSegments[0]}`);
    lookupUrl.searchParams.set("_id", queryId);
    const lookupRes = await fetch(lookupUrl.toString(), { method: "GET" });
    if (!lookupRes.ok) {
      return new NextResponse(lookupRes.body, {
        status: lookupRes.status,
        headers: lookupRes.headers,
      });
    }
    const records = await lookupRes.json();
    const record = Array.isArray(records) ? records[0] : records;
    if (!record) {
      return new NextResponse("Not found", { status: 404 });
    }
    const targetId = record.id ?? record._id;
    targetUrl = new URL(`${JSON_SERVER_URL}/${resolvedSegments[0]}/${targetId}`);
    searchParams.delete("_id");
  }

  searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("cookie");
  headers.delete("authorization");

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(targetUrl.toString(), init);
  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(request, context.params.path);
}
