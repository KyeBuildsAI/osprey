import { refreshFemaSnapshot } from "@/lib/fema";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { snapshot, updated } = await refreshFemaSnapshot();
    return Response.json({
      updated,
      outcome: snapshot.refresh.lastOutcome,
      sourceKind: snapshot.source.kind,
      verifiedAt: snapshot.source.verifiedAt,
      featureCount: snapshot.collection.features.length,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { updated: false, outcome: "FAILURE", message: "The last verified FEMA snapshot remains in use." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
