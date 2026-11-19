export function getKimaCookieDomain(hostname: string): string | undefined {
  const rootDomain = (process.env.NEXT_PUBLIC_KIMA_ROOT_DOMAIN || 'kima.ao')
    .replace(/^\./, '')
    .toLowerCase();
  const normalizedHost = hostname.toLowerCase();

  if (
    normalizedHost === rootDomain ||
    normalizedHost.endsWith(`.${rootDomain}`)
  ) {
    return `.${rootDomain}`;
  }

  return undefined;
}
