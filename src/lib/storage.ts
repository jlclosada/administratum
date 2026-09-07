import { v4 as uuid } from 'uuid';
import { STORAGE_BUCKET, supabase } from './supabase';

/**
 * Upload a File to Supabase Storage and return its public URL.
 * Files are namespaced per user: `${userId}/${folder}/${uuid}.ext`.
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No hay sesión activa.');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${user.id}/${folder}/${uuid()}.${ext}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Remove a previously uploaded file given its public URL. Best-effort. */
export async function removeFileByUrl(
  publicUrl: string | null | undefined,
): Promise<void> {
  if (!publicUrl) return;
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}

/**
 * Delete every file the current user has stored under their `${userId}/` prefix.
 * Best-effort: used when a user deletes their account. Iterates known folders.
 */
export async function removeAllUserFiles(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const folders = ['covers', 'miniatures', 'process', 'lists', 'pdfs', 'misc'];
  const bucket = supabase.storage.from(STORAGE_BUCKET);

  for (const folder of folders) {
    const prefix = `${user.id}/${folder}`;
    const { data, error } = await bucket.list(prefix, { limit: 1000 });
    if (error || !data?.length) continue;
    const paths = data
      .filter((item) => item.id !== null)
      .map((item) => `${prefix}/${item.name}`);
    if (paths.length) await bucket.remove(paths);
  }
}

/**
 * Open the native file picker in the browser and resolve with the selected files.
 * Replacement for the Tauri dialog `open()`.
 */
export function pickFiles(
  options: { accept?: string; multiple?: boolean } = {},
): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept ?? 'image/*';
    input.multiple = options.multiple ?? false;
    input.style.display = 'none';
    document.body.appendChild(input);

    let settled = false;
    const cleanup = () => {
      input.remove();
    };

    input.addEventListener('change', () => {
      settled = true;
      const files = input.files ? Array.from(input.files) : [];
      cleanup();
      resolve(files);
    });

    // Resolve empty if the dialog is cancelled (focus returns without change).
    window.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          if (!settled) {
            cleanup();
            resolve([]);
          }
        }, 500);
      },
      { once: true },
    );

    input.click();
  });
}
