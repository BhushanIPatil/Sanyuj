export type PostalLocality = {
  name: string;
  district: string | null;
  state: string | null;
};

type PostOffice = {
  Name?: string;
  District?: string;
  State?: string;
};

type PostalApiResponse = {
  Status?: string;
  Message?: string;
  PostOffice?: PostOffice[] | null;
};

export async function fetchLocalitiesForPincode(pincode: string): Promise<PostalLocality[]> {
  const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
    cache: "force-cache",
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error("Could not look up pincode");

  const data = (await res.json()) as PostalApiResponse[];
  const block = data[0];
  if (!block || block.Status !== "Success" || !block.PostOffice?.length) {
    throw new Error("No localities found for this pincode");
  }

  const seen = new Set<string>();
  const localities: PostalLocality[] = [];
  for (const office of block.PostOffice) {
    const name = office.Name?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    localities.push({
      name,
      district: office.District?.trim() || null,
      state: office.State?.trim() || null,
    });
  }

  localities.sort((a, b) => a.name.localeCompare(b.name));
  if (!localities.length) throw new Error("No localities found for this pincode");
  return localities;
}
