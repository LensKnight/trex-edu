const TREXVIEW_URL = "https://trexview.vercel.app";

export function buildTrexViewLink(
  fileUrl: string,
  fileName: string,
  type?: "pdf" | "image"
) {
  const params = new URLSearchParams({
    src: fileUrl,
    name: fileName,
  });

  if (type) params.set("type", type);

  return `${TREXVIEW_URL}/view?${params.toString()}`;
}