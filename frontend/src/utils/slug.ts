export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple dashes with single dash
    .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
}

export function createQueryUrl(queryId: string, queryName: string): string {
  const slug = slugify(queryName)
  return `/query/${queryId}${slug ? `/${slug}` : ''}`
}