const TREXVIEW_URL = "https://trexview.vercel.app";

export function buildTrexViewLink(
  telegramFileUrl: string,
  fileName: string,
  type?: "pdf" | "image"
) {
  const proxiedUrl = `${window.location.origin}/api/file-proxy?url=${encodeURIComponent(telegramFileUrl)}`;
  const params = new URLSearchParams({ src: proxiedUrl, name: fileName });
  if (type) params.set("type", type);
  return `${TREXVIEW_URL}/view?${params.toString()}`;
}
