import { NextResponse } from "next/server"
import { loadCustomers } from "@/lib/customers"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({ customers: await loadCustomers() })
}
