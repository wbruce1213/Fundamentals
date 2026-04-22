import { getSpotById, listAllSpots } from "@/lib/solver/spots";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const spotId = searchParams.get("spotId");

  // List all available spots
  if (!spotId) {
    return Response.json({
      spots: listAllSpots().map((spot) => ({
        id: spot.id,
        name: spot.name,
        description: spot.description,
      })),
    });
  }

  // Get a specific spot
  const spot = getSpotById(spotId);
  if (!spot) {
    return Response.json({ error: "Spot not found" }, { status: 404 });
  }

  return Response.json(spot);
}
