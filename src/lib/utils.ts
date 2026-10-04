export function getValidAvatarUrl(url: string | null): string | null {
  if (!url) return null;

  // Extract ID from Google Drive view links
  // Example: https://drive.google.com/file/d/1Z8-W1jYScI4qGvUP3n0wLygGF5Fj5_QU/view?usp=drive_link
  const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)(?:\/|$)/;
  const match = url.match(driveRegex);
  
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }

  return url;
}
