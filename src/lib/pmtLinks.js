const PMT_BASE = 'https://pmt.physicsandmathstutor.com/download/';
const OCR_BASE = 'https://www.ocr.org.uk/Images/';

// OCR A Maths QP/MS are hosted on ocr.org.uk with per-paper image IDs (not templatable).
// Keys: '{paperSuffix}-{year}', values: { qp: imageId, ms: imageId }
const OCR_A_MATHS_IDS = {
  'pure-2018':       { qp: 535607, ms: 535621 },
  'statistics-2018': { qp: 535611, ms: 535622 },
  'mechanics-2018':  { qp: 535617, ms: 535623 },
  'pure-2019':       { qp: 621197, ms: 621389 },
  'statistics-2019': { qp: 621199, ms: 621390 },
  'mechanics-2019':  { qp: 621201, ms: 621391 },
  'pure-2020':       { qp: 643526, ms: 643532 },
  'statistics-2020': { qp: 643528, ms: 643533 },
  'mechanics-2020':  { qp: 643530, ms: 643534 },
  'pure-2021':       { qp: 667253, ms: 667259 },
  'statistics-2021': { qp: 667255, ms: 667260 },
  'mechanics-2021':  { qp: 667257, ms: 667261 },
  'pure-2022':       { qp: 676845, ms: 677005 },
  'statistics-2022': { qp: 676847, ms: 677006 },
  'mechanics-2022':  { qp: 676849, ms: 677007 },
  'pure-2023':       { qp: 703866, ms: 704008 },
  'statistics-2023': { qp: 703868, ms: 704009 },
  'mechanics-2023':  { qp: 703870, ms: 704010 },
};

const OCR_A_MATHS_COMPONENT = {
  'pure':       'pure-mathematics',
  'statistics': 'pure-mathematics-and-statistics',
  'mechanics':  'pure-mathematics-and-mechanics',
};

// Build a PMT PDF download URL.
// suffix: optional filename suffix before .pdf, e.g. ' (Mech)'
function buildPmtUrl(subjectDir, paperFolder, session, type, suffix = '') {
  return `${PMT_BASE}${subjectDir}/${paperFolder}/${type}/${session} ${type}${suffix}.pdf`;
}

// Edexcel A-level regular Maths ran in October (not June) for 2020 and 2021.
function edexcelMathsSession(year) {
  const y = parseInt(year);
  return (y === 2020 || y === 2021) ? `October ${year}` : `June ${year}`;
}

function mathsLinks(paperPath) {
  if (
    paperPath === 'madas-mp2' ||
    paperPath === 'madas-syn' ||
    paperPath === 'knowledge-organiser'
  ) return null;

  const parts = paperPath.split('-');
  if (parts.length < 3) return null;

  const board = parts[0];
  const year = parts[1];
  const paperSuffix = parts.slice(2).join('-');

  // OCR A Maths — hardcoded lookup on ocr.org.uk
  if (board === 'ocr') {
    const entry = OCR_A_MATHS_IDS[`${paperSuffix}-${year}`];
    if (!entry) return null;
    const component = OCR_A_MATHS_COMPONENT[paperSuffix];
    if (!component) return null;
    return {
      qp: `${OCR_BASE}${entry.qp}-question-paper-${component}.pdf`,
      ms: `${OCR_BASE}${entry.ms}-mark-scheme-${component}.pdf`,
    };
  }

  if (board === 'aqa') {
    const paperNumMap = {
      'pure': '1', 'pure-1': '1',
      'statistics': '2', 'pure-2': '2',
      'mechanics': '3', 'stats-and-mechanics': '3',
    };
    const paperN = paperNumMap[paperSuffix];
    if (!paperN) return null;
    const dir = 'Maths/A-level/Papers/AQA';
    return {
      qp: buildPmtUrl(dir, `Paper-${paperN}`, `June ${year}`, 'QP'),
      ms: buildPmtUrl(dir, `Paper-${paperN}`, `June ${year}`, 'MS'),
    };
  }

  if (board === 'edexcel') {
    const session = edexcelMathsSession(year);

    if (paperSuffix === 'pure-1' || paperSuffix === 'pure') {
      const dir = 'Maths/A-level/Papers/Edexcel';
      return {
        qp: buildPmtUrl(dir, 'Paper-1', session, 'QP'),
        ms: buildPmtUrl(dir, 'Paper-1', session, 'MS'),
      };
    }
    if (paperSuffix === 'pure-2') {
      const dir = 'Maths/A-level/Papers/Edexcel';
      return {
        qp: buildPmtUrl(dir, 'Paper-2', session, 'QP'),
        ms: buildPmtUrl(dir, 'Paper-2', session, 'MS'),
      };
    }
    if (paperSuffix === 'stats-and-mechanics') {
      // Paper-3 is split into Mechanics and Statistics sections on PMT.
      // Links to the Mechanics section; Statistics section uses the same pattern with (Stats).
      const dir = 'Maths/A-level/Papers/Edexcel';
      return {
        qp: buildPmtUrl(dir, 'Paper-3', session, 'QP', ' (Mech)'),
        ms: buildPmtUrl(dir, 'Paper-3', session, 'MS', ' (Mech)'),
      };
    }
    return null;
  }

  return null;
}

function physicsLinks(paperPath) {
  if (paperPath === 'isb') return null;

  const parts = paperPath.split('-');
  if (parts.length < 3) return null;

  const board = parts[0];
  const year = parts[1];
  const paperSuffix = parts.slice(2).join('-');

  if (board === 'ocr') {
    const ocrPaperMap = {
      'modelling-physics': '1',
      'exploring-physics': '2',
      'unified-physics': '3',
    };
    const paperN = ocrPaperMap[paperSuffix];
    if (!paperN) return null;
    const dir = 'Physics/A-level/Past-Papers/OCR-A';
    return {
      qp: buildPmtUrl(dir, `Paper-${paperN}`, `June ${year}`, 'QP'),
      ms: buildPmtUrl(dir, `Paper-${paperN}`, `June ${year}`, 'MS'),
    };
  }

  if (board === 'aqa') {
    if (paperSuffix === 'paper3ba' || paperSuffix === 'paper3bb' || paperSuffix === 'paper3bc') return null;
    const aqaPaperFolderMap = {
      'paper1': 'Paper-1',
      'paper2': 'Paper-2',
      'paper3a': 'Paper-3A',
    };
    const paperFolder = aqaPaperFolderMap[paperSuffix];
    if (!paperFolder) return null;
    const dir = 'Physics/A-level/Past-Papers/AQA';
    return {
      qp: buildPmtUrl(dir, paperFolder, `June ${year}`, 'QP'),
      ms: buildPmtUrl(dir, paperFolder, `June ${year}`, 'MS'),
    };
  }

  return null;
}

// Returns the PMT session string for FM papers, or null if no papers exist for that year.
// OCR FM ran a November series in 2020/2021 (COVID). AQA FM had no papers those years.
// Edexcel FM used June throughout.
function fmSession(board, year) {
  const y = parseInt(year);
  if (y === 2020 || y === 2021) {
    if (board === 'ocr') return `Nov ${year}`;
    if (board === 'aqa') return null;
    // edexcel: June series still ran
  }
  return `June ${year}`;
}

function furtherMathsLinks(paperPath) {
  if (paperPath === 'textbook') return null;

  const parts = paperPath.split('-');
  if (parts.length < 3) return null;

  const firstPart = parts[0]; // 'ocr' or 'foreign'

  if (firstPart === 'ocr') {
    const year = parts[1];
    const paperSuffix = parts.slice(2).join('-');

    const session = fmSession('ocr', year);
    if (!session) return null;

    const paperFolderMap = {
      'pure-core-1':    'Pure-Core-1',
      'pure-core-2':    'Pure-Core-2',
      'mechanics':      'Mechanics',
      'statistics':     'Statistics',
      'discrete':       'Discrete',
      'additional-pure': 'Additional-Pure',
    };
    const paperFolder = paperFolderMap[paperSuffix];
    if (!paperFolder) return null;

    const dir = 'Maths/A-level/Papers/OCR-Further';
    return {
      qp: buildPmtUrl(dir, paperFolder, session, 'QP'),
      ms: buildPmtUrl(dir, paperFolder, session, 'MS'),
    };
  }

  if (firstPart === 'foreign') {
    if (parts.length < 4) return null;
    const board = parts[1]; // 'aqa' or 'edexcel'
    const year = parts[2];
    const paperSuffix = parts.slice(3).join('-');

    if (board === 'aqa') {
      const session = fmSession('aqa', year);
      if (!session) return null;

      const paperFolderMap = {
        'core-pure-1': 'Paper-1',
        'core-pure-2': 'Paper-2',
        'mechanics':   'Paper-3-Mechanics',
        'statistics':  'Paper-3-Statistics',
        'discrete':    'Paper-3-Discrete',
      };
      const paperFolder = paperFolderMap[paperSuffix];
      if (!paperFolder) return null;
      const dir = 'Maths/A-level/Papers/AQA-Further';
      return {
        qp: buildPmtUrl(dir, paperFolder, session, 'QP'),
        ms: buildPmtUrl(dir, paperFolder, session, 'MS'),
      };
    }

    if (board === 'edexcel') {
      const session = fmSession('edexcel', year);
      if (!session) return null;

      const paperFolderMap = {
        'core-pure-1':         'Core-Pure-1',
        'core-pure-2':         'Core-Pure-2',
        'further-pure-1':      'Further-Pure-1',
        'further-pure-2':      'Further-Pure-2',
        'further-mechanics-1': 'Mechanics-1',
        'further-mechanics-2': 'Mechanics-2',
        'statistics-1':        'Statistics-1',
        'statistics-2':        'Statistics-2',
        'decision-1':          'Decision-1',
        'decision-2':          'Decision-2',
      };
      const paperFolder = paperFolderMap[paperSuffix];
      if (!paperFolder) return null;
      const dir = 'Maths/A-level/Papers/Edexcel-Further';
      return {
        qp: buildPmtUrl(dir, paperFolder, session, 'QP'),
        ms: buildPmtUrl(dir, paperFolder, session, 'MS'),
      };
    }
  }

  return null;
}

/**
 * Returns PDF links for a paper, or null if no link is available.
 * OCR A Maths links are on ocr.org.uk; all others on pmt.physicsandmathstutor.com.
 * @param {string} subject - 'maths' | 'physics' | 'computerScience' | 'furtherMaths'
 * @param {string} paperPath - e.g. 'ocr-2023-pure', 'aqa-2023-paper1'
 * @returns {{ qp: string, ms: string } | null}
 */
export function getPmtLinks(subject, paperPath) {
  if (!subject || !paperPath) return null;

  switch (subject) {
    case 'maths':           return mathsLinks(paperPath);
    case 'physics':         return physicsLinks(paperPath);
    case 'computerScience': return null;
    case 'furtherMaths':    return furtherMathsLinks(paperPath);
    default:                return null;
  }
}
