import { getPersonDetails } from "@/lib/tmdb";
import PersonClient from "./PersonClient";

export default async function PersonProfilePage({ params }: { params: { id: string } }) {
  const person = await getPersonDetails(params.id);

  return <PersonClient person={person} />;
}
