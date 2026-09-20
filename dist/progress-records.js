// The supplied progress records are indexes, not the worksheet question files.
// Keep their identities separate from the existing illustrative P3/P6 questions.
import { primaryLowerRecords } from './primary-lower-records.js';
import { primaryUpperRecords } from './primary-upper-records.js';
import { secondaryKindergartenRecords } from './secondary-kindergarten-records.js';

const familyLabels = { math: 'Math 1–6', excel: 'EXCEL', revision: 'Revision', ce: 'CE Rev', ps: 'PS', sspa: 'Assessment', ex: 'EX', mc: 'MC', quiz: 'QUIZ', books: 'Books', supplementary: 'Supplementary worksheets' };
const familyLabelsZh = { math: '基礎練習', excel: '進階練習', revision: '溫習', ce: '綜合溫習', ps: '應用題', sspa: '評估', ex: '練習', mc: '選擇題', quiz: '小測', books: '練習冊', supplementary: '補充工作紙' };

function buildCatalogue(level, record) {
  const topics = record.topics.map(topic => ({ ...topic, id: topic.code }));
  const catalog = new Map();
  const groups = [];
  function addWorksheet(family, section, item, topic, supplemental = false) {
    const entry = typeof item === 'object' ? item : { variant: item };
    const variant = String(entry.variant);
    const familyLabel = record.columns?.find(([id]) => id === family)?.[1] || familyLabels[family] || family;
    // The repeated PS 35 box in the P4 source points to the same worksheet.
    const identity = family === 'ps' ? variant : section + '-' + (entry.code || variant);
    const id = level.toLowerCase() + '-' + family + '-' + encodeURIComponent(identity);
    const code = entry.code || (family === 'math' ? section + variant : family === 'excel' ? 'EXCEL ' + section + variant : family === 'ps' ? 'PS ' + variant : family === 'books' ? section + ' ' + variant : (family === 'sspa' ? topic.label : section) + ' ' + (record.columns && !supplemental ? familyLabel + ' ' : '') + variant);
    if (!catalog.has(id)) catalog.set(id, {
      id, code, level, family, familyLabel, variant,
      title: entry.title || topic.title,
      titleZh: entry.titleZh || topic.titleZh || familyLabelsZh[family],
      topic: topic.title, topicZh: topic.titleZh || familyLabelsZh[family],
      term: topic.term,
      ...(supplemental ? { sectionId: section, topicCodes: topic.topicCodes || [] } : { topicCode: topic.code }),
      source: entry.source || topic.source || record.source,
      ...(entry.sourcePage || topic.sourcePage ? { sourcePage: entry.sourcePage || topic.sourcePage } : {}),
      ...(entry.pagesLabel || topic.pagesLabel ? { pagesLabel: entry.pagesLabel || topic.pagesLabel } : {}),
      ...(family === 'ps' ? { number: Number(variant.replace('*', '')), starred: variant.includes('*') } : {}),
      catalogueOnly: true, format: 'catalogue', questions: [],
      pages: null, minutes: null, colour: 'blue', type: 'number'
    });
    return id;
  }
  for (const topic of topics) {
    const families = topic.families || { math: topic.math, excel: topic.excel };
    for (const [family, variants] of Object.entries(families)) {
      for (const variant of variants || []) addWorksheet(family, topic.code, variant, topic);
    }
  }
  for (const section of record.supplements || []) {
    let group = groups.find(item => item.id === section.family);
    if (!group) { group = { id: section.family, label: familyLabels[section.family], sections: [] }; groups.push(group); }
    const topic = { ...section, title: section.label, titleZh: section.titleZh };
    const worksheetIds = section.variants.map(variant => addWorksheet(section.family, section.id, variant, topic, true));
    group.sections.push({ ...section, worksheetIds });
  }
  return { topics, worksheets: [...catalog.values()], groups, columns: record.columns, termLabels: record.termLabels, source: record.source, sources: record.sources || [record.source] };
}

export const progressRecordCatalogues = Object.fromEntries(Object.entries({ ...primaryLowerRecords, ...primaryUpperRecords, ...secondaryKindergartenRecords })
  .map(([level, record]) => [level, buildCatalogue(level, record)]));
export const progressRecordWorksheets = Object.values(progressRecordCatalogues).flatMap(catalogue => catalogue.worksheets);
