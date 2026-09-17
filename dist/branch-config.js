// Both branches run the same application and fixtures. Only identity, teaching
// team, entry paths and the browser's saved demo namespace vary by branch.
const configurations = {
  tw: {
    id: 'tw', basePath: '/', storageKey: 'mathconcept-demo-v4',
    centre: { name: 'MathConcept (Tsuen Wan)', branch: 'Tsuen Wan', branchZh: '荃灣', code: 'TWN', manager: 'Koko Ko', managerId: 'chan', initials: 'KK' },
    tutors: [
      { id: 'chan', name: 'Koko', initials: 'K' },
      { id: 'wong', name: 'Ming', initials: 'M' },
      { id: 'oscar', name: 'Oscar', initials: 'O' },
      { id: 'peter', name: 'Peter', initials: 'P' },
      { id: 'polly', name: 'Polly', initials: 'P' },
      { id: 'shileen', name: 'Shileen', initials: 'S' },
      { id: 'tiffany', name: 'Tiffany', initials: 'T' },
      { id: 'winky', name: 'Winky', initials: 'W' }
    ]
  },
  hh: {
    id: 'hh', basePath: '/hh/', storageKey: 'mathconcept-demo-hh-v4',
    centre: { name: 'MathConcept (Hang Hau)', branch: 'Hang Hau', branchZh: '坑口', code: 'HH', manager: 'Rico', managerId: 'ricco', initials: 'R' },
    tutors: [
      { id: 'ricco', name: 'Rico', initials: 'R' },
      { id: 'john', name: 'John', initials: 'J' },
      { id: 'leo', name: 'Leo', initials: 'L' },
      { id: 'amy', name: 'Amy', initials: 'A' },
      { id: 'melissa', name: 'Melissa', initials: 'M' },
      { id: 'jason', name: 'Jason', initials: 'J' }
    ]
  }
};

export function getCentreConfig(pathname = '/') {
  return /^\/hh(?:\/|$)/.test(pathname) ? configurations.hh : configurations.tw;
}

export const centreConfig = getCentreConfig(globalThis.location?.pathname || '/');
