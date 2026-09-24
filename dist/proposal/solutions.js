// Solution 1 remains the default for every existing proposal link.
export function getProposalSolution(url) {
  return url.searchParams.get('solution') === '2' ? '2' : '1';
}

export function proposalSolutionUrl(href, nextSolution, { chapter = 'learning' } = {}) {
  const url = new URL(href);
  if (String(nextSolution) === '2') url.searchParams.set('solution', '2');
  else url.searchParams.delete('solution');
  url.hash = chapter;
  return url.pathname + url.search + url.hash;
}
