window.GPA_SCALES = [
  {
    name: "University of Toronto",
    province: "Ontario",
    scaleType: "4.0",
    sourceUrl: "https://utsc.utoronto.ca/academic-handbook/section8",
    mappings: [
      { letter: "A+", percent: "90-100", points: "4.0" },
      { letter: "A", percent: "85-89", points: "4.0" },
      { letter: "A-", percent: "80-84", points: "3.7" },
      { letter: "B+", percent: "77-79", points: "3.3" },
      { letter: "B", percent: "73-76", points: "3.0" },
      { letter: "B-", percent: "70-72", points: "2.7" },
      { letter: "C+", percent: "67-69", points: "2.3" },
      { letter: "C", percent: "63-66", points: "2.0" },
      { letter: "C-", percent: "60-62", points: "1.7" },
      { letter: "D+", percent: "57-59", points: "1.3" },
      { letter: "D", percent: "53-56", points: "1.0" },
      { letter: "D-", percent: "50-52", points: "0.7" },
      { letter: "F", percent: "0-49", points: "0.0" }
    ]
  },
  {
    name: "McGill University",
    province: "Quebec",
    scaleType: "4.0",
    sourceUrl: "https://www.mcgill.ca/study/2020-2021/university_regulations_and_resources/undergraduate/gi_grading_and_grade_point_averages",
    mappings: [
      { letter: "A", percent: "85-100", points: "4.0" },
      { letter: "A-", percent: "80-84", points: "3.7" },
      { letter: "B+", percent: "75-79", points: "3.3" },
      { letter: "B", percent: "70-74", points: "3.0" },
      { letter: "B-", percent: "65-69", points: "2.7" },
      { letter: "C+", percent: "60-64", points: "2.3" },
      { letter: "C", percent: "55-59", points: "2.0" },
      { letter: "D", percent: "50-54", points: "1.0" },
      { letter: "F", percent: "0-49", points: "0.0" }
    ]
  },
  {
    name: "University of British Columbia",
    province: "British Columbia",
    scaleType: "Percent",
    sourceUrl: "https://students.ubc.ca/enrolment/courses/grades",
    note: "Percent-to-letter ranges shown. GPA points are not defined at the institutional level.",
    mappings: [
      { letter: "A+", percent: "90-100", points: null },
      { letter: "A", percent: "85-89", points: null },
      { letter: "A-", percent: "80-84", points: null },
      { letter: "B+", percent: "76-79", points: null },
      { letter: "B", percent: "72-75", points: null },
      { letter: "B-", percent: "68-71", points: null },
      { letter: "C+", percent: "64-67", points: null },
      { letter: "C", percent: "60-63", points: null },
      { letter: "C-", percent: "55-59", points: null },
      { letter: "D", percent: "50-54", points: null },
      { letter: "F", percent: "0-49", points: null }
    ]
  },
  {
    name: "University of Waterloo",
    province: "Ontario",
    scaleType: "Percent",
    sourceUrl: "https://ugradcalendar.uwaterloo.ca/page/Acad-Regs-Grade-Conversion-Scale",
    note: "Legacy letter conversion for pre-2001 courses; Waterloo now reports numeric grades.",
    mappings: [
      { letter: "A+", percent: "90-100", points: null },
      { letter: "A", percent: "85-89", points: null },
      { letter: "A-", percent: "80-84", points: null },
      { letter: "B+", percent: "77-79", points: null },
      { letter: "B", percent: "73-76", points: null },
      { letter: "B-", percent: "70-72", points: null },
      { letter: "C+", percent: "67-69", points: null },
      { letter: "C", percent: "63-66", points: null },
      { letter: "C-", percent: "60-62", points: null },
      { letter: "D+", percent: "57-59", points: null },
      { letter: "D", percent: "53-56", points: null },
      { letter: "D-", percent: "50-52", points: null },
      { letter: "F+", percent: "42-49", points: null },
      { letter: "F", percent: "35-41", points: null },
      { letter: "F-", percent: "0-34", points: null }
    ]
  },
  {
    name: "Queen's University",
    province: "Ontario",
    scaleType: "4.3",
    sourceUrl: "https://www.queensu.ca/artsci/undergraduate/student-services/academic-support/grading-information",
    mappings: [
      { letter: "A+", percent: "90-100", points: "4.3" },
      { letter: "A", percent: "85-89.9", points: "4.0" },
      { letter: "A-", percent: "80-84.9", points: "3.7" },
      { letter: "B+", percent: "77-79.9", points: "3.3" },
      { letter: "B", percent: "73-76.9", points: "3.0" },
      { letter: "B-", percent: "70-72.9", points: "2.7" },
      { letter: "C+", percent: "67-69.9", points: "2.3" },
      { letter: "C", percent: "63-66.9", points: "2.0" },
      { letter: "C-", percent: "60-62.9", points: "1.7" },
      { letter: "D+", percent: "57-59.9", points: "1.3" },
      { letter: "D", percent: "53-56.9", points: "1.0" },
      { letter: "D-", percent: "50-52.9", points: "0.7" },
      { letter: "F", percent: "0-49.9", points: "0.0" }
    ]
  },
  {
    name: "McMaster University",
    province: "Ontario",
    scaleType: "12-point",
    sourceUrl: "https://registrar.mcmaster.ca/exams-grades/grades/",
    mappings: [
      { letter: "A+", percent: "90-100", points: "12" },
      { letter: "A", percent: "85-89", points: "11" },
      { letter: "A-", percent: "80-84", points: "10" },
      { letter: "B+", percent: "77-79", points: "9" },
      { letter: "B", percent: "73-76", points: "8" },
      { letter: "B-", percent: "70-72", points: "7" },
      { letter: "C+", percent: "67-69", points: "6" },
      { letter: "C", percent: "63-66", points: "5" },
      { letter: "C-", percent: "60-62", points: "4" },
      { letter: "D+", percent: "57-59", points: "3" },
      { letter: "D", percent: "53-56", points: "2" },
      { letter: "D-", percent: "50-52", points: "1" },
      { letter: "F", percent: "0-49", points: "0" }
    ]
  },
  {
    name: "University of Ottawa",
    province: "Ontario",
    scaleType: "10-point",
    sourceUrl: "https://www.uottawa.ca/about-us/policies-regulations/academic-regulations/a-3-grading-system",
    mappings: [
      { letter: "A+", percent: "90-100", points: "10" },
      { letter: "A", percent: "85-89", points: "9" },
      { letter: "A-", percent: "80-84", points: "8" },
      { letter: "B+", percent: "75-79", points: "7" },
      { letter: "B", percent: "70-74", points: "6" },
      { letter: "C+", percent: "65-69", points: "5" },
      { letter: "C", percent: "60-64", points: "4" },
      { letter: "D+", percent: "55-59", points: "3" },
      { letter: "D", percent: "50-54", points: "2" },
      { letter: "E", percent: "40-49", points: "1" },
      { letter: "F", percent: "0-39", points: "0" }
    ]
  },
  {
    name: "York University",
    province: "Ontario",
    scaleType: "9-point",
    sourceUrl: "https://calendars.students.yorku.ca/2024-2025/academic/grades-and-grading-schemes",
    mappings: [
      { letter: "A+", percent: "90-100", points: "9" },
      { letter: "A", percent: "80-89", points: "8" },
      { letter: "B+", percent: "75-79", points: "7" },
      { letter: "B", percent: "70-74", points: "6" },
      { letter: "C+", percent: "65-69", points: "5" },
      { letter: "C", percent: "60-64", points: "4" },
      { letter: "D+", percent: "55-59", points: "3" },
      { letter: "D", percent: "50-54", points: "2" },
      { letter: "E", percent: "40-49", points: "1" },
      { letter: "F", percent: "0-39", points: "0" }
    ]
  },
  {
    name: "Carleton University",
    province: "Ontario",
    scaleType: "12-point",
    sourceUrl: "https://calendar.carleton.ca/undergrad/regulations/academicregulationsandrequirements/grading/",
    mappings: [
      { letter: "A+", percent: "90-100", points: "12" },
      { letter: "A", percent: "85-89", points: "11" },
      { letter: "A-", percent: "80-84", points: "10" },
      { letter: "B+", percent: "77-79", points: "9" },
      { letter: "B", percent: "73-76", points: "8" },
      { letter: "B-", percent: "70-72", points: "7" },
      { letter: "C+", percent: "67-69", points: "6" },
      { letter: "C", percent: "63-66", points: "5" },
      { letter: "C-", percent: "60-62", points: "4" },
      { letter: "D+", percent: "57-59", points: "3" },
      { letter: "D", percent: "53-56", points: "2" },
      { letter: "D-", percent: "50-52", points: "1" },
      { letter: "F", percent: "0-49", points: "0" }
    ]
  },
  {
    name: "Western University",
    province: "Ontario",
    scaleType: "Percent",
    sourceUrl: "https://teaching.uwo.ca/academic-resources/grades-and-assessments.html",
    note: "Percent-to-letter ranges shown; GPA points vary by program.",
    mappings: [
      { letter: "A+", percent: "90-100", points: null },
      { letter: "A", percent: "80-89", points: null },
      { letter: "B", percent: "70-79", points: null },
      { letter: "C", percent: "60-69", points: null },
      { letter: "D", percent: "50-59", points: null },
      { letter: "F", percent: "0-49", points: null }
    ]
  },
  {
    name: "Simon Fraser University",
    province: "British Columbia",
    scaleType: "4.33",
    sourceUrl: "https://www.sfu.ca/students/calendar/2025/fall/general/grading.html",
    note: "Points shown; percent conversion varies by course.",
    mappings: [
      { letter: "A+", percent: null, points: "4.33" },
      { letter: "A", percent: null, points: "4.00" },
      { letter: "A-", percent: null, points: "3.67" },
      { letter: "B+", percent: null, points: "3.33" },
      { letter: "B", percent: null, points: "3.00" },
      { letter: "B-", percent: null, points: "2.67" },
      { letter: "C+", percent: null, points: "2.33" },
      { letter: "C", percent: null, points: "2.00" },
      { letter: "C-", percent: null, points: "1.67" },
      { letter: "D", percent: null, points: "1.00" },
      { letter: "F", percent: null, points: "0.00" }
    ]
  },
  {
    name: "University of Alberta",
    province: "Alberta",
    scaleType: "4.0",
    sourceUrl: "https://www.ualberta.ca/registrar/examinations/assessment-and-grading/grading-system-explained.html",
    note: "Points shown; percent conversion varies by faculty.",
    mappings: [
      { letter: "A+", percent: null, points: "4.0" },
      { letter: "A", percent: null, points: "4.0" },
      { letter: "A-", percent: null, points: "3.7" },
      { letter: "B+", percent: null, points: "3.3" },
      { letter: "B", percent: null, points: "3.0" },
      { letter: "B-", percent: null, points: "2.7" },
      { letter: "C+", percent: null, points: "2.3" },
      { letter: "C", percent: null, points: "2.0" },
      { letter: "C-", percent: null, points: "1.7" },
      { letter: "D+", percent: null, points: "1.3" },
      { letter: "D", percent: null, points: "1.0" },
      { letter: "F", percent: null, points: "0.0" }
    ]
  },
  {
    name: "University of Calgary",
    province: "Alberta",
    scaleType: "4.0",
    sourceUrl: "https://www.ucalgary.ca/pubs/calendar/current/f-1-1.html",
    note: "Points shown; percent conversion varies by faculty.",
    mappings: [
      { letter: "A+", percent: null, points: "4.0" },
      { letter: "A", percent: null, points: "4.0" },
      { letter: "A-", percent: null, points: "3.7" },
      { letter: "B+", percent: null, points: "3.3" },
      { letter: "B", percent: null, points: "3.0" },
      { letter: "B-", percent: null, points: "2.7" },
      { letter: "C+", percent: null, points: "2.3" },
      { letter: "C", percent: null, points: "2.0" },
      { letter: "C-", percent: null, points: "1.7" },
      { letter: "D+", percent: null, points: "1.3" },
      { letter: "D", percent: null, points: "1.0" },
      { letter: "F", percent: null, points: "0.0" }
    ]
  }
];
