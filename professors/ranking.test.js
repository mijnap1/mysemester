const assert = require('node:assert/strict');
const {
  PROFESSOR_DATA,
  professorRankDetails,
  rankProfessors,
  reviewConfidenceLabel
} = require('./professors.js');

const csc108 = PROFESSOR_DATA.find(course => course.courseCode === 'CSC108');
const ranked = rankProfessors(csc108.professors);
const angelaIndex = ranked.findIndex(prof => prof.name === 'Angela Bernuy');
const sadiaIndex = ranked.findIndex(prof => prof.name === 'Sadia Sharmin');

assert.equal(ranked[0].name, 'Sadia Sharmin');
assert.ok(sadiaIndex < angelaIndex);
assert.equal(reviewConfidenceLabel(5), 'Light sample');
assert.ok(professorRankDetails(ranked[0]).score > professorRankDetails(ranked[1]).score);
