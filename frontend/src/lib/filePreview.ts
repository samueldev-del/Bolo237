export async function fileToImageDataUrl(file: File | null, maxBytes = 1_500_000): Promise<string | null> {
  if (!file) return null;
  if (!file.type.startsWith('image/')) return null;
  if (file.size > maxBytes) return null;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
