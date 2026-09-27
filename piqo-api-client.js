export const PIQO_API_BASE_URL = "http://91.247.171.166";

export function parsePiqoApiResponse(payload) {
  if (!payload || !Array.isArray(payload.results)) return [];

  return payload.results.map((item) => {
    const price = Number(item?.price);
    const originalPrice = Number(item?.originalPrice);
    const url = typeof item?.url === "string" ? item.url.trim() : "";
    if (!Number.isFinite(price) || price <= 0 || !url || item?.availability === false) {
      return null;
    }

    return {
      store: item.store || "افیلیو",
      storeColor: "#16C995",
      name: item.name || "کالا",
      price: Math.round(price),
      originalPrice: Number.isFinite(originalPrice) && originalPrice >= price
        ? Math.round(originalPrice)
        : Math.round(price),
      discount: Math.max(0, Number(item.discount) || 0),
      url,
      image: item.image || "",
      rating: 0,
      reviewCount: 0,
      availability: true,
      condition: item.condition === "used" ? "used" : "new",
      source: "affilio",
      sourceUrl: item.sourceUrl || null,
      isAffiliate: true,
      productCode: item.code || null,
    };
  }).filter(Boolean);
}
