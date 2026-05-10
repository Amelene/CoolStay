export const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to https://www.coolstay.site in prod
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel
    'http://localhost:3000';

  // Make sure to include `https://` when not localhost
  url = url.includes('http') ? url : `https://${url}`;
  // Make sure to remove trailing slash
  url = url.charAt(url.length - 1) === '/' ? url.slice(0, -1) : url;
  return url;
};