import { describe, it, expect } from 'vitest';
import { getPmtLinks } from '../pmtLinks';

const PMT = 'https://pmt.physicsandmathstutor.com/download/';
const OCR = 'https://www.ocr.org.uk/Images/';

describe('getPmtLinks', () => {
  // --- Maths: OCR A (ocr.org.uk hardcoded IDs) ---
  it('maths OCR A pure 2022 → ocr.org.uk', () => {
    const links = getPmtLinks('maths', 'ocr-2022-pure');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${OCR}676845-question-paper-pure-mathematics.pdf`);
    expect(links.ms).toBe(`${OCR}677005-mark-scheme-pure-mathematics.pdf`);
  });

  it('maths OCR A statistics 2019 → ocr.org.uk', () => {
    const links = getPmtLinks('maths', 'ocr-2019-statistics');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${OCR}621199-question-paper-pure-mathematics-and-statistics.pdf`);
    expect(links.ms).toBe(`${OCR}621390-mark-scheme-pure-mathematics-and-statistics.pdf`);
  });

  it('maths OCR A mechanics 2021 → ocr.org.uk', () => {
    const links = getPmtLinks('maths', 'ocr-2021-mechanics');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${OCR}667257-question-paper-pure-mathematics-and-mechanics.pdf`);
    expect(links.ms).toBe(`${OCR}667261-mark-scheme-pure-mathematics-and-mechanics.pdf`);
  });

  it('maths OCR A 2024 → null (no ID yet)', () => {
    expect(getPmtLinks('maths', 'ocr-2024-pure')).toBeNull();
  });

  // --- Maths: AQA / Edexcel (PMT-hosted) ---
  it('maths AQA mechanics 2021 → Paper-3 AQA', () => {
    const links = getPmtLinks('maths', 'aqa-2021-mechanics');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/AQA/Paper-3/QP/June 2021 QP.pdf`);
    expect(links.ms).toBe(`${PMT}Maths/A-level/Papers/AQA/Paper-3/MS/June 2021 MS.pdf`);
  });

  it('maths Edexcel pure-1 → Paper-1', () => {
    const links = getPmtLinks('maths', 'edexcel-2022-pure-1');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/Edexcel/Paper-1/QP/June 2022 QP.pdf`);
  });

  it('maths Edexcel pure-2 → Paper-2', () => {
    const links = getPmtLinks('maths', 'edexcel-2022-pure-2');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/Edexcel/Paper-2/QP/June 2022 QP.pdf`);
  });

  it('maths Edexcel stats-and-mechanics 2023 → Paper-3 (Mech) variant', () => {
    const links = getPmtLinks('maths', 'edexcel-2023-stats-and-mechanics');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/Edexcel/Paper-3/QP/June 2023 QP (Mech).pdf`);
    expect(links.ms).toBe(`${PMT}Maths/A-level/Papers/Edexcel/Paper-3/MS/June 2023 MS (Mech).pdf`);
  });

  it('maths Edexcel stats-and-mechanics 2020 → October session', () => {
    const links = getPmtLinks('maths', 'edexcel-2020-stats-and-mechanics');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/Edexcel/Paper-3/QP/October 2020 QP (Mech).pdf`);
  });

  it('maths Edexcel pure-1 2020 → October session', () => {
    const links = getPmtLinks('maths', 'edexcel-2020-pure-1');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/Edexcel/Paper-1/QP/October 2020 QP.pdf`);
  });

  it('maths madas-mp2 → null', () => {
    expect(getPmtLinks('maths', 'madas-mp2')).toBeNull();
  });

  it('maths madas-syn → null', () => {
    expect(getPmtLinks('maths', 'madas-syn')).toBeNull();
  });

  it('maths knowledge-organiser → null', () => {
    expect(getPmtLinks('maths', 'knowledge-organiser')).toBeNull();
  });

  // --- Physics ---
  it('physics AQA paper1 2019 → Paper-1', () => {
    const links = getPmtLinks('physics', 'aqa-2019-paper1');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Physics/A-level/Past-Papers/AQA/Paper-1/QP/June 2019 QP.pdf`);
    expect(links.ms).toBe(`${PMT}Physics/A-level/Past-Papers/AQA/Paper-1/MS/June 2019 MS.pdf`);
  });

  it('physics AQA paper3a 2022 → Paper-3A folder', () => {
    const links = getPmtLinks('physics', 'aqa-2022-paper3a');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Physics/A-level/Past-Papers/AQA/Paper-3A/QP/June 2022 QP.pdf`);
  });

  it('physics AQA paper3ba → null (Paper-3B not on PMT)', () => {
    expect(getPmtLinks('physics', 'aqa-2022-paper3ba')).toBeNull();
  });

  it('physics OCR modelling-physics 2020 → OCR-A Paper-1', () => {
    const links = getPmtLinks('physics', 'ocr-2020-modelling-physics');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Physics/A-level/Past-Papers/OCR-A/Paper-1/QP/June 2020 QP.pdf`);
    expect(links.ms).toBe(`${PMT}Physics/A-level/Past-Papers/OCR-A/Paper-1/MS/June 2020 MS.pdf`);
  });

  it('physics OCR unified-physics 2021 → OCR-A Paper-3', () => {
    const links = getPmtLinks('physics', 'ocr-2021-unified-physics');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Physics/A-level/Past-Papers/OCR-A/Paper-3/QP/June 2021 QP.pdf`);
  });

  it('physics isb → null', () => {
    expect(getPmtLinks('physics', 'isb')).toBeNull();
  });

  // --- Computer Science ---
  it('computerScience → null', () => {
    expect(getPmtLinks('computerScience', 'paper1-2023')).toBeNull();
  });

  // --- Further Maths: OCR A ---
  it('furtherMaths OCR pure-core-1 2022 → OCR-Further Pure-Core-1', () => {
    const links = getPmtLinks('furtherMaths', 'ocr-2022-pure-core-1');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/OCR-Further/Pure-Core-1/QP/June 2022 QP.pdf`);
    expect(links.ms).toBe(`${PMT}Maths/A-level/Papers/OCR-Further/Pure-Core-1/MS/June 2022 MS.pdf`);
  });

  it('furtherMaths OCR mechanics 2020 → Nov 2020 (COVID series)', () => {
    const links = getPmtLinks('furtherMaths', 'ocr-2020-mechanics');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/OCR-Further/Mechanics/QP/Nov 2020 QP.pdf`);
    expect(links.ms).toBe(`${PMT}Maths/A-level/Papers/OCR-Further/Mechanics/MS/Nov 2020 MS.pdf`);
  });

  it('furtherMaths OCR additional-pure 2021 → Nov 2021 (COVID series)', () => {
    const links = getPmtLinks('furtherMaths', 'ocr-2021-additional-pure');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/OCR-Further/Additional-Pure/QP/Nov 2021 QP.pdf`);
  });

  it('furtherMaths OCR pure-core-2 2019 → June 2019', () => {
    const links = getPmtLinks('furtherMaths', 'ocr-2019-pure-core-2');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/OCR-Further/Pure-Core-2/QP/June 2019 QP.pdf`);
  });

  // --- Further Maths: Foreign AQA ---
  it('furtherMaths foreign AQA 2021 → null (no AQA FM papers that year)', () => {
    expect(getPmtLinks('furtherMaths', 'foreign-aqa-2021-core-pure-1')).toBeNull();
  });

  it('furtherMaths foreign AQA core-pure-1 2022 → AQA-Further Paper-1', () => {
    const links = getPmtLinks('furtherMaths', 'foreign-aqa-2022-core-pure-1');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/AQA-Further/Paper-1/QP/June 2022 QP.pdf`);
    expect(links.ms).toBe(`${PMT}Maths/A-level/Papers/AQA-Further/Paper-1/MS/June 2022 MS.pdf`);
  });

  it('furtherMaths foreign AQA 2020 → null (no AQA FM papers that year)', () => {
    expect(getPmtLinks('furtherMaths', 'foreign-aqa-2020-core-pure-1')).toBeNull();
  });

  it('furtherMaths foreign AQA mechanics → AQA-Further Paper-3-Mechanics', () => {
    const links = getPmtLinks('furtherMaths', 'foreign-aqa-2023-mechanics');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/AQA-Further/Paper-3-Mechanics/QP/June 2023 QP.pdf`);
  });

  // --- Further Maths: Foreign Edexcel ---
  it('furtherMaths foreign Edexcel core-pure-1 → Edexcel-Further Core-Pure-1', () => {
    const links = getPmtLinks('furtherMaths', 'foreign-edexcel-2022-core-pure-1');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/Edexcel-Further/Core-Pure-1/QP/June 2022 QP.pdf`);
    expect(links.ms).toBe(`${PMT}Maths/A-level/Papers/Edexcel-Further/Core-Pure-1/MS/June 2022 MS.pdf`);
  });

  it('furtherMaths foreign Edexcel further-pure-1 2023 → Further-Pure-1', () => {
    const links = getPmtLinks('furtherMaths', 'foreign-edexcel-2023-further-pure-1');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/Edexcel-Further/Further-Pure-1/QP/June 2023 QP.pdf`);
  });

  it('furtherMaths foreign Edexcel further-mechanics-1 → Mechanics-1', () => {
    const links = getPmtLinks('furtherMaths', 'foreign-edexcel-2022-further-mechanics-1');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/Edexcel-Further/Mechanics-1/QP/June 2022 QP.pdf`);
  });

  it('furtherMaths foreign Edexcel 2020 → June 2020 (Edexcel ran normally)', () => {
    const links = getPmtLinks('furtherMaths', 'foreign-edexcel-2020-core-pure-1');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/Edexcel-Further/Core-Pure-1/QP/June 2020 QP.pdf`);
  });

  it('furtherMaths OCR statistics 2023 → OCR-Further Statistics', () => {
    const links = getPmtLinks('furtherMaths', 'ocr-2023-statistics');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/OCR-Further/Statistics/QP/June 2023 QP.pdf`);
    expect(links.ms).toBe(`${PMT}Maths/A-level/Papers/OCR-Further/Statistics/MS/June 2023 MS.pdf`);
  });

  it('furtherMaths OCR discrete 2022 → OCR-Further Discrete', () => {
    const links = getPmtLinks('furtherMaths', 'ocr-2022-discrete');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/OCR-Further/Discrete/QP/June 2022 QP.pdf`);
  });

  it('furtherMaths OCR statistics 2020 → Nov 2020', () => {
    const links = getPmtLinks('furtherMaths', 'ocr-2020-statistics');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/OCR-Further/Statistics/QP/Nov 2020 QP.pdf`);
  });

  it('furtherMaths foreign AQA statistics → AQA-Further Paper-3-Statistics', () => {
    const links = getPmtLinks('furtherMaths', 'foreign-aqa-2022-statistics');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/AQA-Further/Paper-3-Statistics/QP/June 2022 QP.pdf`);
  });

  it('furtherMaths foreign AQA discrete → AQA-Further Paper-3-Discrete', () => {
    const links = getPmtLinks('furtherMaths', 'foreign-aqa-2023-discrete');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/AQA-Further/Paper-3-Discrete/QP/June 2023 QP.pdf`);
  });

  it('furtherMaths foreign Edexcel statistics-1 → Edexcel-Further Statistics-1', () => {
    const links = getPmtLinks('furtherMaths', 'foreign-edexcel-2022-statistics-1');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/Edexcel-Further/Statistics-1/QP/June 2022 QP.pdf`);
  });

  it('furtherMaths foreign Edexcel decision-1 → Edexcel-Further Decision-1', () => {
    const links = getPmtLinks('furtherMaths', 'foreign-edexcel-2023-decision-1');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/Edexcel-Further/Decision-1/QP/June 2023 QP.pdf`);
  });

  it('furtherMaths foreign Edexcel decision-2 → Edexcel-Further Decision-2', () => {
    const links = getPmtLinks('furtherMaths', 'foreign-edexcel-2022-decision-2');
    expect(links).not.toBeNull();
    expect(links.qp).toBe(`${PMT}Maths/A-level/Papers/Edexcel-Further/Decision-2/QP/June 2022 QP.pdf`);
  });

  it('furtherMaths textbook → null', () => {
    expect(getPmtLinks('furtherMaths', 'textbook')).toBeNull();
  });

  // --- Unknown subjects / guard clauses ---
  it('unknown subject → null', () => {
    expect(getPmtLinks('chemistry', 'aqa-2022-paper1')).toBeNull();
  });

  it('null subject → null', () => {
    expect(getPmtLinks(null, 'ocr-2022-pure')).toBeNull();
  });

  it('null paperPath → null', () => {
    expect(getPmtLinks('maths', null)).toBeNull();
  });

  it('empty strings → null', () => {
    expect(getPmtLinks('', '')).toBeNull();
  });
});
