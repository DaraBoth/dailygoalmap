/**
 * Constructs a fully qualified URL for notifications using the environment's public URL
 * or falling back to window.location.origin.
 * 
 * @param path - The relative path or full URL
 * @returns A fully qualified URL or null if no path provided
 */
export function constructNotificationUrl(path: string | undefined): string | null {
  if (!path) return null;
  
  // If it's already a full URL, return as is
  if (String(path).startsWith('http')) {
    return String(path);
  }
  
  // Get base URL from environment or fallback to window.location.origin
  const baseUrl = import.meta.env.VITE_PUBLIC_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  
  // Ensure clean base URL without trailing slash
  const cleanBase = baseUrl.replace(/\/$/, '');
  
  // Construct full URL ensuring proper slash between base and path
  return cleanBase + (String(path).startsWith('/') ? String(path) : '/' + String(path));
}