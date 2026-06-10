type Translator = (key: string, options?: Record<string, unknown>) => string;

export function formatListingResults(
  t: Translator,
  options: { from: number; to: number; total?: number | null },
) {
  if (typeof options.total === 'number') {
    return t('system.listing.results', options);
  }

  return t('system.listing.resultsSimple', options);
}

export function formatListingPage(
  t: Translator,
  options: { page: number; totalPages?: number | null },
) {
  if (typeof options.totalPages === 'number') {
    return t('system.listing.pageOf', options);
  }

  return t('system.listing.page', options);
}
