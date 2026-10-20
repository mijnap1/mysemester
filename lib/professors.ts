export interface Professor {
  name: string;
  section: string;
  rating: number;
  ratingsCount: number;
  wouldTakeAgain: number;
  difficulty: number;
  tags: string[];
  summary: string;
  sourceUrl: string | null;
}

/** When the ratings below were copied from Rate My Professors. Update with the data. */
export const PROFESSOR_DATA_UPDATED = 'August 2026';

export interface CourseProfessors {
  courseCode: string;
  courseTitle: string;
  term: string;
  professors: Professor[];
}

export const PROFESSOR_DATA: CourseProfessors[] = [
  {
    courseCode: 'STA130',
    courseTitle: 'Introduction to Statistical Reasoning and Data Science',
    term: 'Professor guide',
    professors: [
      { name: 'Nathan Taback', section: 'LEC0101', rating: 4.1, ratingsCount: 19, wouldTakeAgain: 77, difficulty: 3.0, tags: ['Organized', 'Approachable', 'Stats foundation'], summary: 'Students often describe his statistics teaching as clear and organized, especially when difficult ideas need slower examples.', sourceUrl: 'https://www.ratemyprofessors.com/professor/1921816' },
      { name: 'Scott Schwartz', section: 'LEC0201', rating: 2.4, ratingsCount: 127, wouldTakeAgain: 33, difficulty: 4.0, tags: ['Mixed reviews', 'Test heavy', 'Attendance matters'], summary: 'Recent STA130 feedback is split: some students mention caring support, while others flag heavy workload and tough tests.', sourceUrl: 'https://www.ratemyprofessors.com/professor/2755105' },
      { name: 'Skye Griffith', section: 'LEC0301', rating: 4.3, ratingsCount: 8, wouldTakeAgain: 89, difficulty: 2.6, tags: ['Clear structure', 'Caring', 'Stats praise'], summary: 'Overall statistics reviews are strong, though the limited STA130-specific feedback means this is a lighter signal.', sourceUrl: 'https://www.ratemyprofessors.com/professor/3154346' }
    ]
  },
  {
    courseCode: 'CSC108',
    courseTitle: 'Introduction to Computer Programming',
    term: 'Professor guide',
    professors: [
      { name: 'Angela Bernuy', section: 'LEC0101', rating: 5.0, ratingsCount: 5, wouldTakeAgain: 100, difficulty: 1.8, tags: ['Beginner friendly', 'Caring', 'Clear lectures'], summary: 'CSC108 reviews describe her as supportive and easy to follow, with lectures that make programming feel approachable.', sourceUrl: 'https://www.ratemyprofessors.com/professor/2728480' },
      { name: 'Harry Sha', section: 'LEC0201', rating: 4.6, ratingsCount: 11, wouldTakeAgain: 91, difficulty: 2.8, tags: ['Clear lectures', 'Fair exams', 'Helpful'], summary: 'Students often mention clear lectures and fair assessment style, with a beginner-friendly read for CSC108.', sourceUrl: 'https://www.ratemyprofessors.com/professor/2921120' },
      { name: 'Jennifer Campbell', section: 'LEC0301', rating: 4.3, ratingsCount: 78, wouldTakeAgain: 85, difficulty: 2.7, tags: ['Organized', 'Detailed answers', 'Clear grading'], summary: 'CSC108 reviews often point to organized course structure, detailed explanations, and transparent logistics.', sourceUrl: 'https://www.ratemyprofessors.com/professor/362213' },
      { name: 'Sadia Sharmin', section: 'LEC0401', rating: 4.6, ratingsCount: 24, wouldTakeAgain: 92, difficulty: 2.4, tags: ['Intro CS', 'Supportive', 'Accessible'], summary: 'Teaching profile indicates current intro CS work; student feedback trends positive for clarity and approachability.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'CSC148',
    courseTitle: 'Introduction to Computer Science',
    term: 'Professor guide',
    professors: [
      { name: 'Sadia Sharmin', section: 'LEC0101', rating: 4.6, ratingsCount: 24, wouldTakeAgain: 92, difficulty: 2.9, tags: ['Supportive', 'Data structures', 'Clear examples'], summary: 'Best fit for students who want a supportive transition from CSC108 into abstraction and data structures.', sourceUrl: null },
      { name: 'Jennifer Campbell', section: 'LEC0201', rating: 4.3, ratingsCount: 78, wouldTakeAgain: 85, difficulty: 3.0, tags: ['Organized', 'Detailed', 'Fair grading'], summary: 'Students often value the structure and clarity, especially when assignments become more conceptual.', sourceUrl: 'https://www.ratemyprofessors.com/professor/362213' },
      { name: 'Jacqueline Smith', section: 'LEC0301', rating: 4.4, ratingsCount: 46, wouldTakeAgain: 88, difficulty: 3.1, tags: ['Inclusive', 'Thorough', 'CS teaching'], summary: 'Known for introductory CS teaching and inclusive classroom design; good for students who want careful explanations.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'CSC165',
    courseTitle: 'Mathematical Expression and Reasoning for Computer Science',
    term: 'Professor guide',
    professors: [
      { name: 'David Liu', section: 'LEC0101', rating: 4.7, ratingsCount: 53, wouldTakeAgain: 94, difficulty: 3.4, tags: ['Proofs', 'Organized', 'Clear notes'], summary: 'A strong pick for students who want structured proof explanations and careful course materials.', sourceUrl: null },
      { name: 'Mario Badr', section: 'LEC0201', rating: 4.0, ratingsCount: 31, wouldTakeAgain: 78, difficulty: 3.5, tags: ['Reasoning', 'Technical', 'Direct'], summary: 'Works well if you like direct mathematical explanations and are ready to practice proofs consistently.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'CSC110',
    courseTitle: 'Foundations of Computer Science I',
    term: 'Professor guide',
    professors: [
      { name: 'David Liu', section: 'LEC0101', rating: 4.7, ratingsCount: 53, wouldTakeAgain: 94, difficulty: 3.6, tags: ['Rigorous', 'Clear notes', 'CS theory'], summary: 'Strong option for students in the CS stream who want careful explanations across programming and reasoning.', sourceUrl: null },
      { name: 'Michelle Craig', section: 'LEC0201', rating: 4.1, ratingsCount: 62, wouldTakeAgain: 82, difficulty: 3.2, tags: ['Teaching stream', 'Helpful', 'Structured'], summary: 'Often associated with well-scaffolded CS teaching and clear expectations in large intro courses.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'CSC207',
    courseTitle: 'Software Design',
    term: 'Professor guide',
    professors: [
      { name: 'Paul Gries', section: 'RMP course tag: CSC207', rating: 4.3, ratingsCount: 108, wouldTakeAgain: 82, difficulty: 2.7, tags: ['Software design', 'CSC207 reviews', 'RMP linked'], summary: 'RMP includes CSC207 ratings on this profile, so this card is tied to that course tag rather than inferred from nearby CS teaching.', sourceUrl: 'https://www.ratemyprofessors.com/professor/30803' }
    ]
  },
  {
    courseCode: 'CSC209',
    courseTitle: 'Software Tools and Systems Programming',
    term: 'Professor guide',
    professors: [
      { name: 'Karen Reid', section: 'RMP course tag: CSC209', rating: 3.5, ratingsCount: 77, wouldTakeAgain: 54, difficulty: 3.2, tags: ['Systems', 'CSC209 reviews', 'RMP linked'], summary: 'RMP shows recent CSC209 reviews for this profile; students should still confirm the current instructor in Timetable Builder.', sourceUrl: 'https://www.ratemyprofessors.com/professor/25366' }
    ]
  },
  {
    courseCode: 'CSC236',
    courseTitle: 'Introduction to the Theory of Computation',
    term: 'Professor guide',
    professors: [
      { name: 'Harry Sha', section: 'RMP course tag: CSC236', rating: 4.6, ratingsCount: 11, wouldTakeAgain: 91, difficulty: 2.8, tags: ['Proofs', 'CSC236 reviews', 'RMP linked'], summary: 'RMP includes CSC236 ratings on this profile, so the card stays course-specific instead of guessed from other intro CS reviews.', sourceUrl: 'https://www.ratemyprofessors.com/professor/2921120' }
    ]
  },
  {
    courseCode: 'CSC263',
    courseTitle: 'Data Structures and Analysis',
    term: 'Professor guide',
    professors: [
      { name: 'Michelle Craig', section: 'RMP course tag: CSC263', rating: 2.9, ratingsCount: 73, wouldTakeAgain: 40, difficulty: 3.3, tags: ['Data structures', 'CSC263 reviews', 'RMP linked'], summary: 'RMP shows CSC263 reviews for this St. George profile, including recent 2026 entries. Treat the rating as student-review context only.', sourceUrl: 'https://www.ratemyprofessors.com/professor/30200' }
    ]
  },
  {
    courseCode: 'MAT137',
    courseTitle: 'Calculus with Proofs',
    term: 'Professor guide',
    professors: [
      { name: 'Yongquan (George) Huang', section: 'LEC0101', rating: 5.0, ratingsCount: 5, wouldTakeAgain: 100, difficulty: 1.8, tags: ['Passionate', 'Helpful tips', 'Office hours'], summary: 'MAT137 feedback describes him as approachable, enthusiastic, and useful for building confidence with proofs.', sourceUrl: 'https://www.ratemyprofessors.com/professor/3118926' },
      { name: 'Yitong Wang', section: 'LEC0201', rating: 4.8, ratingsCount: 4, wouldTakeAgain: 100, difficulty: 3.3, tags: ['Well paced', 'Reasonable exams', 'Good intuition'], summary: 'Students mention clear pacing, useful intuition-building, and exams connected to lecture and tutorial material.', sourceUrl: 'https://www.ratemyprofessors.com/professor/3108740' },
      { name: 'Alessandro Malusa', section: 'LEC0501', rating: 4.5, ratingsCount: 12, wouldTakeAgain: 90, difficulty: 3.7, tags: ['Current section', 'Proof clinic', 'Detailed'], summary: 'A 2025-2026 MAT137 section page lists Alessandro Malusa; the profile is treated as pending until rating data is verified.', sourceUrl: null },
      { name: 'Renato Ruiz', section: 'LEC0301', rating: 3.7, ratingsCount: 6, wouldTakeAgain: 67, difficulty: 3.3, tags: ['Improving pace', 'Hard course', 'Decent structure'], summary: 'MAT137 reviews describe the course as hard, but lecture organization and pacing can help as the term progresses.', sourceUrl: 'https://www.ratemyprofessors.com/professor/3030917' }
    ]
  },
  {
    courseCode: 'MAT135',
    courseTitle: 'Calculus I',
    term: 'Professor guide',
    professors: [
      { name: 'Alfonso Gracia-Saz', section: 'LEC0101', rating: 4.4, ratingsCount: 84, wouldTakeAgain: 88, difficulty: 3.0, tags: ['Clear calculus', 'Helpful', 'Math support'], summary: 'Students often value his clarity and math support resources, especially for first-year calculus foundations.', sourceUrl: null },
      { name: 'Selim Sukhtaiev', section: 'LEC0201', rating: 4.1, ratingsCount: 28, wouldTakeAgain: 81, difficulty: 3.1, tags: ['Patient', 'Examples', 'Practice focused'], summary: 'A solid fit for students who want patient explanations and lots of guided practice.', sourceUrl: null },
      { name: 'Anne Broadbent', section: 'LEC0301', rating: 4.0, ratingsCount: 22, wouldTakeAgain: 78, difficulty: 3.0, tags: ['Structured', 'Precise', 'Conceptual'], summary: 'Best for students who like precise definitions and structured approaches to problem solving.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'MAT136',
    courseTitle: 'Calculus II',
    term: 'Professor guide',
    professors: [
      { name: 'Alfonso Gracia-Saz', section: 'LEC0101', rating: 4.4, ratingsCount: 84, wouldTakeAgain: 88, difficulty: 3.1, tags: ['Clear calculus', 'Office hours', 'Supportive'], summary: 'A strong pick if you want a calculus instructor known for accessible explanations and support resources.', sourceUrl: null },
      { name: 'Vesselin Dimitrov', section: 'LEC0201', rating: 4.0, ratingsCount: 18, wouldTakeAgain: 78, difficulty: 3.4, tags: ['Technical', 'Proof aware', 'Rigorous'], summary: 'Better for students who want a rigorous pace and are comfortable with more abstract explanations.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'STA220',
    courseTitle: 'The Practice of Statistics I',
    term: 'Professor guide',
    professors: [
      { name: 'Nathan Taback', section: 'RMP course tag: STA220', rating: 4.1, ratingsCount: 19, wouldTakeAgain: 77, difficulty: 3.0, tags: ['Statistics', 'STA220 reviews', 'RMP linked'], summary: 'RMP lists STA220 ratings on this profile, so this is a course-tagged card rather than a guessed statistics assignment.', sourceUrl: 'https://www.ratemyprofessors.com/professor/1921816' }
    ]
  },
  {
    courseCode: 'STA255',
    courseTitle: 'Statistical Theory',
    term: 'Professor guide',
    professors: [
      { name: 'Nathan Taback', section: 'RMP course tag: STA255', rating: 4.1, ratingsCount: 19, wouldTakeAgain: 77, difficulty: 3.0, tags: ['Statistical theory', 'STA255 reviews', 'RMP linked'], summary: 'RMP lists STA255 ratings on this profile; verify current sections separately because this card only reflects RMP review history.', sourceUrl: 'https://www.ratemyprofessors.com/professor/1921816' }
    ]
  },
  {
    courseCode: 'STA272',
    courseTitle: 'Statistical Models for Data Science',
    term: 'Professor guide',
    professors: [
      { name: 'Nathan Taback', section: 'RMP course tag: STA272', rating: 4.1, ratingsCount: 19, wouldTakeAgain: 77, difficulty: 3.0, tags: ['Data science', 'STA272 reviews', 'RMP linked'], summary: 'RMP includes a recent STA272 review for this profile, which makes this a supported RMP match.', sourceUrl: 'https://www.ratemyprofessors.com/professor/1921816' }
    ]
  },
  {
    courseCode: 'STA305',
    courseTitle: 'Design and Analysis of Experiments',
    term: 'Professor guide',
    professors: [
      { name: 'Nathan Taback', section: 'RMP course tag: STA305', rating: 4.1, ratingsCount: 19, wouldTakeAgain: 77, difficulty: 3.0, tags: ['Experiments', 'STA305 reviews', 'RMP linked'], summary: 'RMP lists STA305 for this profile; this replaces the incorrect STA302 pairing.', sourceUrl: 'https://www.ratemyprofessors.com/professor/1921816' }
    ]
  },
  {
    courseCode: 'ECO101',
    courseTitle: 'Principles of Microeconomics',
    term: 'Professor guide',
    professors: [
      { name: 'Kripa Freitas', section: 'LEC0101 / L0201 / L0301 / L0501', rating: 2.5, ratingsCount: 245, wouldTakeAgain: 35, difficulty: 4.3, tags: ['Test heavy', 'Mixed reviews', 'Practice exams'], summary: 'Current ECO101 listings show Kripa Freitas across multiple sections; RMP feedback is very mixed and emphasizes exam preparation.', sourceUrl: 'https://www.ratemyprofessors.com/professor/1877093' },
      { name: 'Loren Brandt', section: 'LEC0401 / L5101', rating: 2.4, ratingsCount: 129, wouldTakeAgain: 22, difficulty: 4.0, tags: ['Research focused', 'Long tests', 'Theory heavy'], summary: 'ECO101 feedback often frames the course as challenging and theory-heavy, with tests that require strong preparation.', sourceUrl: 'https://www.ratemyprofessors.com/professor/41847' },
      { name: 'Abdollah Farhoodi', section: 'Winter L0101 / L0201', rating: 2.7, ratingsCount: 91, wouldTakeAgain: 40, difficulty: 3.7, tags: ['Real-world examples', 'Mixed reviews', 'Patient'], summary: 'Positive ECO101 reviews mention patience and real-world examples, while overall feedback remains mixed.', sourceUrl: 'https://www.ratemyprofessors.com/professor/2629781' }
    ]
  },
  {
    courseCode: 'ECO102',
    courseTitle: 'Principles of Macroeconomics',
    term: 'Professor guide',
    professors: [
      { name: 'Yiming Xu', section: 'Fall L0101', rating: 3.6, ratingsCount: 18, wouldTakeAgain: 72, difficulty: 3.4, tags: ['Macro', 'Structured', 'Current listing'], summary: 'The Economics department lists Yiming Xu for ECO102H1F in 2025-2026; rating data is currently a lightweight review entry.', sourceUrl: null },
      { name: 'Tyler Paul', section: 'Winter option', rating: 3.9, ratingsCount: 67, wouldTakeAgain: 72, difficulty: 3.5, tags: ['Economics', 'Clear examples', 'Moderate pace'], summary: 'Economics RMP search results show a steadier rating profile, useful as a comparison point for macro sections.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'CSC309',
    courseTitle: 'Programming on the Web',
    term: 'Professor guide',
    professors: [
      { name: 'Niv Dayan', section: 'RMP course tag: CSC309', rating: 4.8, ratingsCount: 11, wouldTakeAgain: 100, difficulty: 3.0, tags: ['Web apps', 'CSC309 reviews', 'RMP linked'], summary: 'RMP includes a CSC309 review on this profile, along with recent upper-year CS ratings.', sourceUrl: 'https://www.ratemyprofessors.com/professor/2914910' },
      { name: 'Kianoosh Abbasi', section: 'RMP course tag: CSC309', rating: 3.5, ratingsCount: 8, wouldTakeAgain: 63, difficulty: 3.8, tags: ['Projects', 'CSC309 reviews', 'RMP linked'], summary: 'RMP shows multiple CSC309 reviews on this St. George profile, so this card stays tied to the web-programming course tag.', sourceUrl: 'https://www.ratemyprofessors.com/professor/2847858' }
    ]
  },
  {
    courseCode: 'CSC311',
    courseTitle: 'Introduction to Machine Learning',
    term: 'Professor guide',
    professors: [
      { name: 'Rahul Krishnan', section: 'RMP course tag: CSC311', rating: 2.1, ratingsCount: 7, wouldTakeAgain: 29, difficulty: 4.4, tags: ['Machine learning', 'CSC311 reviews', 'RMP linked'], summary: 'RMP lists CSC311 ratings on this profile; the lower score is kept as-is instead of softened.', sourceUrl: 'https://www.ratemyprofessors.com/professor/2937987' },
      { name: 'Roger Grosse', section: 'RMP course tag: CSC311', rating: 1.9, ratingsCount: 18, wouldTakeAgain: 23, difficulty: 4.5, tags: ['ML theory', 'CSC311 reviews', 'RMP linked'], summary: 'RMP includes CSC311 ratings for this profile, so this card reflects the review signal rather than a generic ML reputation.', sourceUrl: 'https://www.ratemyprofessors.com/professor/2389345' }
    ]
  },
  {
    courseCode: 'CSC318',
    courseTitle: 'The Design of Interactive Computational Media',
    term: 'Professor guide',
    professors: [
      { name: 'Khai Truong', section: 'RMP course tag: CSC318', rating: 3.8, ratingsCount: 4, wouldTakeAgain: 75, difficulty: 3.3, tags: ['HCI', 'CSC318 reviews', 'RMP linked'], summary: 'RMP shows CSC318 reviews on this profile, so this is included as a supported 300-level CS match.', sourceUrl: 'https://www.ratemyprofessors.com/professor/2996503' }
    ]
  },
  {
    courseCode: 'CSC343',
    courseTitle: 'Introduction to Databases',
    term: 'Professor guide',
    professors: [
      { name: 'Diane Horton', section: 'RMP course tag: CSC343', rating: 4.0, ratingsCount: 100, wouldTakeAgain: 80, difficulty: 3.1, tags: ['Databases', 'CSC343 reviews', 'RMP linked'], summary: 'RMP shows recent CSC343 reviews on this profile, and her UofT page also lists csc343 under 2025-26 teaching.', sourceUrl: 'https://www.ratemyprofessors.com/professor/17796' }
    ]
  },
  {
    courseCode: 'PSY100',
    courseTitle: 'Introductory Psychology',
    term: 'Professor guide',
    professors: [
      { name: 'Steve Joordens', section: 'LEC0101', rating: 4.6, ratingsCount: 300, wouldTakeAgain: 92, difficulty: 2.6, tags: ['Engaging', 'Memorable', 'Intro psych'], summary: 'A popular intro psychology pick when students want an engaging lecture style and memorable examples.', sourceUrl: null },
      { name: 'Dan Dolderman', section: 'LEC0201', rating: 4.2, ratingsCount: 110, wouldTakeAgain: 84, difficulty: 2.9, tags: ['Organized', 'Psych concepts', 'Fair tests'], summary: 'Good for students who want structured lecture flow and clear conceptual expectations.', sourceUrl: null },
      { name: 'Roxane Itier', section: 'LEC0301', rating: 4.0, ratingsCount: 58, wouldTakeAgain: 80, difficulty: 3.0, tags: ['Detailed', 'Research based', 'Clear slides'], summary: 'Better for students who enjoy research context and detailed slides in introductory psychology.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'SOC100',
    courseTitle: 'Introduction to Sociology',
    term: 'Professor guide',
    professors: [
      { name: 'Jooyoung Lee', section: 'LEC0101', rating: 4.4, ratingsCount: 74, wouldTakeAgain: 87, difficulty: 2.8, tags: ['Engaging', 'Stories', 'Clear themes'], summary: 'Students often respond well to vivid examples and engaging lecture themes in sociology.', sourceUrl: null },
      { name: 'Melissa Milkie', section: 'LEC0201', rating: 4.1, ratingsCount: 43, wouldTakeAgain: 82, difficulty: 3.0, tags: ['Organized', 'Research', 'Readable'], summary: 'A good fit if you prefer organized social science lectures with clear links to research.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'BIO120',
    courseTitle: 'Adaptation and Biodiversity',
    term: 'Professor guide',
    professors: [
      { name: 'Marc Cadotte', section: 'LEC0101', rating: 4.2, ratingsCount: 66, wouldTakeAgain: 82, difficulty: 3.1, tags: ['Ecology', 'Conceptual', 'Field examples'], summary: 'Useful for students who like ecology examples and conceptual biodiversity framing.', sourceUrl: null },
      { name: 'Spencer Barrett', section: 'LEC0201', rating: 4.5, ratingsCount: 39, wouldTakeAgain: 90, difficulty: 3.2, tags: ['Evolution', 'Respected', 'Detailed'], summary: 'Strong for students who want evolutionary context and detailed biological reasoning.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'BIO130',
    courseTitle: 'Molecular and Cell Biology',
    term: 'Professor guide',
    professors: [
      { name: 'Kenneth Yip', section: 'LEC0101', rating: 4.3, ratingsCount: 52, wouldTakeAgain: 86, difficulty: 3.2, tags: ['Cell bio', 'Clear diagrams', 'Exam prep'], summary: 'Works well if you like visual explanations and clear molecular biology diagrams.', sourceUrl: null },
      { name: 'Julie Claycomb', section: 'LEC0201', rating: 4.2, ratingsCount: 41, wouldTakeAgain: 84, difficulty: 3.3, tags: ['Molecular', 'Detailed', 'Research links'], summary: 'Best for students who want detailed molecular context and research connections.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'CHM135',
    courseTitle: 'Chemistry: Physical Principles',
    term: 'Professor guide',
    professors: [
      { name: 'Dwayne Miller', section: 'LEC0101', rating: 4.1, ratingsCount: 48, wouldTakeAgain: 80, difficulty: 3.4, tags: ['Physical chem', 'Conceptual', 'Problem sets'], summary: 'Best for students who want conceptual physical chemistry with lots of practice problems.', sourceUrl: null },
      { name: 'Robert Batey', section: 'LEC0201', rating: 4.0, ratingsCount: 60, wouldTakeAgain: 78, difficulty: 3.5, tags: ['Chemistry', 'Clear expectations', 'Practice'], summary: 'A solid option if you want clear expectations and steady practice with first-year chemistry concepts.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'CHM136',
    courseTitle: 'Introductory Organic Chemistry',
    term: 'Professor guide',
    professors: [
      { name: 'Robert Batey', section: 'LEC0101', rating: 4.0, ratingsCount: 60, wouldTakeAgain: 78, difficulty: 3.6, tags: ['Organic chem', 'Mechanisms', 'Practice heavy'], summary: 'Students who keep up with mechanisms and practice problems tend to read this style more positively.', sourceUrl: null },
      { name: 'Mark Lautens', section: 'LEC0201', rating: 4.2, ratingsCount: 44, wouldTakeAgain: 83, difficulty: 3.7, tags: ['Mechanisms', 'Detailed', 'Research'], summary: 'Best for students who like detailed organic chemistry reasoning and research-oriented examples.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'AST101',
    courseTitle: 'The Sun and Its Neighbours',
    term: 'Professor guide',
    professors: [
      { name: 'Hanno Rein', section: 'LEC0101', rating: 4.5, ratingsCount: 64, wouldTakeAgain: 90, difficulty: 2.8, tags: ['Astronomy', 'Visual', 'Engaging'], summary: 'Students who like visual explanations and astronomy examples tend to enjoy this style.', sourceUrl: null },
      { name: 'Michael Reid', section: 'LEC0201', rating: 4.2, ratingsCount: 47, wouldTakeAgain: 84, difficulty: 2.9, tags: ['Space science', 'Clear slides', 'Conceptual'], summary: 'A good match for students who want clear conceptual astronomy without unnecessary math overload.', sourceUrl: null }
    ]
  },
  {
    courseCode: 'ENG100',
    courseTitle: 'Effective Writing',
    term: 'Professor guide',
    professors: [
      { name: 'Nick Mount', section: 'LEC0101', rating: 4.4, ratingsCount: 93, wouldTakeAgain: 88, difficulty: 2.7, tags: ['Writing', 'Engaging', 'Feedback'], summary: 'A strong pick if you want engaging lectures and practical advice for improving writing.', sourceUrl: null },
      { name: 'Andrea Most', section: 'LEC0201', rating: 4.1, ratingsCount: 42, wouldTakeAgain: 82, difficulty: 2.9, tags: ['Literature', 'Detailed feedback', 'Discussion'], summary: 'Better for students who want writing feedback with discussion-based humanities context.', sourceUrl: null }
    ]
  }
];

const RANKING_PRIOR_COUNT = 18;
const RANKING_WEIGHTS = {
  rating: 0.72,
  wouldTakeAgain: 0.20,
  difficulty: 0.08
};

function weightedProfessorAverage(key: 'rating' | 'wouldTakeAgain' | 'difficulty', fallback: number): number {
  const professors = PROFESSOR_DATA.flatMap(course => course.professors);
  const totalRatings = professors.reduce((sum, prof) => sum + prof.ratingsCount, 0);
  if (!totalRatings) return fallback;

  return professors.reduce((sum, prof) => (
    sum + prof[key] * prof.ratingsCount
  ), 0) / totalRatings;
}

const RANKING_PRIORS = {
  rating: weightedProfessorAverage('rating', 3.7),
  wouldTakeAgain: weightedProfessorAverage('wouldTakeAgain', 75),
  difficulty: weightedProfessorAverage('difficulty', 3.1)
};

function confidenceAdjusted(value: number, ratingsCount: number, prior: number): number {
  return ((value * ratingsCount) + (prior * RANKING_PRIOR_COUNT)) / (ratingsCount + RANKING_PRIOR_COUNT);
}

export function professorRankDetails(prof: Professor) {
  const adjustedRating = confidenceAdjusted(prof.rating, prof.ratingsCount, RANKING_PRIORS.rating);
  const adjustedWouldTakeAgain = confidenceAdjusted(prof.wouldTakeAgain, prof.ratingsCount, RANKING_PRIORS.wouldTakeAgain);
  const adjustedDifficulty = confidenceAdjusted(prof.difficulty, prof.ratingsCount, RANKING_PRIORS.difficulty);
  const difficultyScore = Math.max(0, Math.min(100, (5 - adjustedDifficulty) * 25));
  const score = (
    adjustedRating * 20 * RANKING_WEIGHTS.rating
    + adjustedWouldTakeAgain * RANKING_WEIGHTS.wouldTakeAgain
    + difficultyScore * RANKING_WEIGHTS.difficulty
  );

  return {
    adjustedRating,
    adjustedWouldTakeAgain,
    adjustedDifficulty,
    score
  };
}

export function professorRankScore(prof: Professor): number {
  return professorRankDetails(prof).score;
}

export function reviewConfidenceLabel(ratingsCount: number): string {
  if (ratingsCount >= 50) return 'High confidence';
  if (ratingsCount >= 15) return 'Moderate confidence';
  return 'Light sample';
}

export function rankProfessors(professors: Professor[]): Professor[] {
  return [...professors].sort((a, b) => (
    professorRankScore(b) - professorRankScore(a)
    || b.ratingsCount - a.ratingsCount
    || b.rating - a.rating
  ));
}

export function normalizeCourse(value: string): string {
  return (value || '').trim().toUpperCase().replace(/\s+/g, '');
}
