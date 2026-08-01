export const apiBase = "http://127.0.0.1:8787/api";

export async function apiGet<T = unknown>(path: string) {
  const response = await fetch(`${apiBase}${path}`);
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as T;
}

export async function apiPost<T = unknown>(path: string, body: unknown) {
  const response = await fetch(`${apiBase}${path}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as T;
}

export async function apiPatch<T = unknown>(path: string, body: unknown) {
  const response = await fetch(`${apiBase}${path}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as T;
}

export async function apiDelete(path: string) {
  const response = await fetch(`${apiBase}${path}`, { method: "DELETE" });
  if (!response.ok) throw new Error(await response.text());
}

export function readFileAsDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}
