import type { Course } from '../types';

/**
 * Sample course catalog for the demo program (illustrative — not a real university catalog).
 * Weekly schedules only matter for current/future semesters, where they drive conflict detection.
 */
export const courses: Course[] = [
  // ── Core ──────────────────────────────────────────────────────────────────
  {
    id: 'CS101', code: 'CS 101', name: 'Introduction to Computer Science', credits: 5, category: 'core', mandatory: true,
    prerequisites: [], offered: ['fall'], workload: 10, difficulty: 2, instructor: 'Dr. Eitan Bar',
    description: 'Programming fundamentals, problem decomposition, recursion and an introduction to complexity.',
    schedule: [{ day: 'Sun', start: '10:00', end: '13:00', kind: 'Lecture' }],
    topics: ['Python', 'Recursion', 'Complexity'],
  },
  {
    id: 'CS102', code: 'CS 102', name: 'Object-Oriented Programming', credits: 4, category: 'core', mandatory: true,
    prerequisites: ['CS101'], offered: ['spring'], workload: 9, difficulty: 2, instructor: 'Dr. Lior Katz',
    description: 'Classes, interfaces, design patterns and testing in a strongly-typed language.',
    schedule: [{ day: 'Mon', start: '12:00', end: '15:00', kind: 'Lecture' }],
    topics: ['Java', 'Design patterns', 'Unit testing'],
  },
  {
    id: 'CS201', code: 'CS 201', name: 'Data Structures', credits: 5, category: 'core', mandatory: true,
    prerequisites: ['CS101'], offered: ['spring'], workload: 11, difficulty: 3, instructor: 'Prof. Rina Gal',
    description: 'Lists, trees, heaps, hashing and graphs, with amortized analysis.',
    schedule: [{ day: 'Tue', start: '10:00', end: '13:00', kind: 'Lecture' }],
    topics: ['Trees', 'Hashing', 'Amortized analysis'],
  },
  {
    id: 'CS202', code: 'CS 202', name: 'Computer Organization', credits: 4, category: 'core', mandatory: true,
    prerequisites: ['CS101'], offered: ['fall'], workload: 9, difficulty: 3, instructor: 'Dr. Yoav Peretz',
    description: 'Digital logic, assembly, memory hierarchy and how programs run on hardware.',
    schedule: [{ day: 'Wed', start: '09:00', end: '12:00', kind: 'Lecture' }],
    topics: ['Assembly', 'Caches', 'Pipelines'],
  },
  {
    id: 'CS210', code: 'CS 210', name: 'Algorithms', credits: 5, category: 'core', mandatory: true,
    prerequisites: ['CS201', 'MATH110'], offered: ['fall'], workload: 12, difficulty: 4, instructor: 'Prof. Rina Gal',
    description: 'Greedy algorithms, dynamic programming, graph algorithms and NP-completeness.',
    schedule: [{ day: 'Sun', start: '14:00', end: '17:00', kind: 'Lecture' }],
    topics: ['Dynamic programming', 'Graphs', 'NP-completeness'],
  },
  {
    id: 'CS220', code: 'CS 220', name: 'Software Engineering', credits: 4, category: 'core', mandatory: true,
    prerequisites: ['CS102'], offered: ['spring'], workload: 9, difficulty: 2, instructor: 'Dr. Noa Friedman',
    description: 'Requirements, architecture, code review, CI/CD and team-based delivery.',
    schedule: [{ day: 'Thu', start: '10:00', end: '13:00', kind: 'Lecture' }],
    topics: ['Architecture', 'CI/CD', 'Agile'],
  },
  {
    id: 'CS230', code: 'CS 230', name: 'Databases', credits: 4, category: 'core', mandatory: true,
    prerequisites: ['CS201'], offered: ['spring'], workload: 8, difficulty: 3, instructor: 'Dr. Amir Shalev',
    description: 'Relational modeling, SQL, indexing, transactions and query optimization.',
    schedule: [{ day: 'Mon', start: '09:00', end: '12:00', kind: 'Lecture' }],
    topics: ['SQL', 'Indexing', 'Transactions'],
  },
  {
    id: 'CS240', code: 'CS 240', name: 'Computer Networks', credits: 4, category: 'core', mandatory: true,
    prerequisites: ['CS202'], offered: ['fall'], workload: 8, difficulty: 3, instructor: 'Dr. Yoav Peretz',
    description: 'Protocol layers, TCP/IP, routing, congestion control and network security basics.',
    schedule: [{ day: 'Tue', start: '13:00', end: '16:00', kind: 'Lecture' }],
    topics: ['TCP/IP', 'Routing', 'Sockets'],
  },
  {
    id: 'CS250', code: 'CS 250', name: 'Theory of Computation', credits: 5, category: 'core', mandatory: true,
    prerequisites: ['MATH110', 'CS210'], offered: ['spring'], workload: 11, difficulty: 4, instructor: 'Prof. Ilana Mor',
    description: 'Automata, formal languages, computability and complexity classes.',
    schedule: [{ day: 'Wed', start: '13:00', end: '16:00', kind: 'Lecture' }],
    topics: ['Automata', 'Turing machines', 'Decidability'],
  },
  {
    id: 'CS310', code: 'CS 310', name: 'Operating Systems', credits: 4, category: 'core', mandatory: true,
    prerequisites: ['CS202', 'CS201'], offered: ['fall'], workload: 11, difficulty: 4, instructor: 'Dr. Tal Ben-David',
    description: 'Processes, scheduling, memory management, file systems and concurrency.',
    schedule: [
      { day: 'Sun', start: '10:00', end: '13:00', kind: 'Lecture' },
      { day: 'Tue', start: '12:00', end: '14:00', kind: 'Recitation' },
    ],
    topics: ['Concurrency', 'Virtual memory', 'File systems'],
  },
  {
    id: 'CS320', code: 'CS 320', name: 'Advanced Algorithms', credits: 4, category: 'core', mandatory: true,
    prerequisites: ['CS210', 'MATH201'], offered: ['spring'], workload: 12, difficulty: 5, instructor: 'Prof. Rina Gal',
    description: 'Randomized and approximation algorithms, network flows and linear programming.',
    schedule: [
      { day: 'Sun', start: '12:00', end: '14:00', kind: 'Recitation' },
      { day: 'Tue', start: '14:00', end: '17:00', kind: 'Lecture' },
    ],
    highDemand: true,
    topics: ['Randomization', 'Approximation', 'Network flows'],
  },

  // ── Mathematics & science ─────────────────────────────────────────────────
  {
    id: 'MATH101', code: 'MATH 101', name: 'Calculus I', credits: 5, category: 'math', mandatory: true,
    prerequisites: [], offered: ['fall'], workload: 10, difficulty: 3, instructor: 'Dr. Gil Avraham',
    description: 'Limits, continuity, derivatives and integrals of single-variable functions.',
    schedule: [{ day: 'Mon', start: '09:00', end: '12:00', kind: 'Lecture' }],
    topics: ['Limits', 'Derivatives', 'Integrals'],
  },
  {
    id: 'MATH110', code: 'MATH 110', name: 'Discrete Mathematics', credits: 5, category: 'math', mandatory: true,
    prerequisites: [], offered: ['fall'], workload: 10, difficulty: 3, instructor: 'Prof. Ilana Mor',
    description: 'Logic, set theory, combinatorics, relations and graph theory.',
    schedule: [{ day: 'Wed', start: '10:00', end: '13:00', kind: 'Lecture' }],
    topics: ['Logic', 'Combinatorics', 'Graph theory'],
  },
  {
    id: 'MATH102', code: 'MATH 102', name: 'Calculus II', credits: 4, category: 'math', mandatory: true,
    prerequisites: ['MATH101'], offered: ['spring'], workload: 9, difficulty: 3, instructor: 'Dr. Gil Avraham',
    description: 'Series, multivariable functions, partial derivatives and multiple integrals.',
    schedule: [{ day: 'Thu', start: '09:00', end: '12:00', kind: 'Lecture' }],
    topics: ['Series', 'Multivariable', 'Integration'],
  },
  {
    id: 'MATH120', code: 'MATH 120', name: 'Linear Algebra', credits: 4, category: 'math', mandatory: true,
    prerequisites: [], offered: ['fall'], workload: 9, difficulty: 3, instructor: 'Dr. Dana Erez',
    description: 'Vector spaces, linear maps, eigenvalues and inner-product spaces.',
    schedule: [{ day: 'Thu', start: '13:00', end: '16:00', kind: 'Lecture' }],
    topics: ['Vector spaces', 'Eigenvalues', 'SVD'],
  },
  {
    id: 'MATH201', code: 'MATH 201', name: 'Probability & Statistics', credits: 4, category: 'math', mandatory: true,
    prerequisites: ['MATH102'], offered: ['fall'], workload: 9, difficulty: 3, instructor: 'Dr. Dana Erez',
    description: 'Probability spaces, random variables, estimation and hypothesis testing.',
    schedule: [{ day: 'Mon', start: '13:00', end: '16:00', kind: 'Lecture' }],
    topics: ['Random variables', 'Estimation', 'Inference'],
  },
  {
    id: 'MATH301', code: 'MATH 301', name: 'Numerical Analysis', credits: 4, category: 'math', mandatory: true,
    prerequisites: ['MATH102', 'MATH120'], offered: ['spring'], workload: 10, difficulty: 3, instructor: 'Dr. Gil Avraham',
    description: 'Floating-point error, root finding, interpolation, numerical integration and linear solvers.',
    schedule: [
      { day: 'Sun', start: '09:00', end: '12:00', kind: 'Lecture' },
      { day: 'Thu', start: '10:00', end: '12:00', kind: 'Recitation' },
    ],
    topics: ['Root finding', 'Interpolation', 'Linear solvers'],
  },

  // ── Electives ─────────────────────────────────────────────────────────────
  {
    id: 'CS340', code: 'CS 340', name: 'Human–Computer Interaction', credits: 3, category: 'elective', mandatory: false,
    prerequisites: ['CS102'], offered: ['spring'], workload: 6, difficulty: 2, instructor: 'Dr. Noa Friedman',
    description: 'User research, prototyping, usability testing and interaction design.',
    schedule: [{ day: 'Wed', start: '14:00', end: '17:00', kind: 'Seminar' }],
    topics: ['Usability', 'Prototyping', 'Research methods'],
  },
  {
    id: 'CS350', code: 'CS 350', name: 'Mobile App Development', credits: 3, category: 'elective', mandatory: false,
    prerequisites: ['CS102'], offered: ['fall'], workload: 7, difficulty: 2, instructor: 'Dr. Lior Katz',
    description: 'Native Android development, app architecture and on-device performance.',
    schedule: [{ day: 'Thu', start: '14:00', end: '17:00', kind: 'Lab' }],
    topics: ['Android', 'Architecture', 'Performance'],
  },
  {
    id: 'CS360', code: 'CS 360', name: 'Introduction to Artificial Intelligence', credits: 4, category: 'elective', mandatory: false,
    prerequisites: ['CS210'], offered: ['spring'], workload: 9, difficulty: 3, instructor: 'Prof. Omer Harel',
    description: 'Search, planning, probabilistic reasoning and an introduction to learning.',
    schedule: [{ day: 'Sun', start: '13:00', end: '16:00', kind: 'Lecture' }],
    topics: ['Search', 'Planning', 'Bayesian networks'],
  },
  {
    id: 'CS410', code: 'CS 410', name: 'Machine Learning', credits: 4, category: 'elective', mandatory: false,
    prerequisites: ['CS360', 'MATH201', 'MATH120'], offered: ['fall'], workload: 11, difficulty: 4, instructor: 'Prof. Omer Harel',
    description: 'Supervised and unsupervised learning, generalization, kernels and neural networks.',
    schedule: [
      { day: 'Mon', start: '14:00', end: '17:00', kind: 'Lecture' },
      { day: 'Thu', start: '10:00', end: '12:00', kind: 'Recitation' },
    ],
    topics: ['Generalization', 'Neural networks', 'Kernels'],
  },
  {
    id: 'CS420', code: 'CS 420', name: 'Computer Vision', credits: 4, category: 'elective', mandatory: false,
    prerequisites: ['CS360', 'MATH120'], offered: ['fall'], workload: 9, difficulty: 4, instructor: 'Dr. Maya Sela',
    description: 'Image formation, features, geometry, detection and deep vision models.',
    schedule: [{ day: 'Tue', start: '09:00', end: '12:00', kind: 'Lecture' }],
    topics: ['Geometry', 'Detection', 'CNNs'],
  },
  {
    id: 'CS430', code: 'CS 430', name: 'Distributed Systems', credits: 3, category: 'elective', mandatory: false,
    prerequisites: ['CS310', 'CS240'], offered: ['spring', 'summer'], workload: 8, difficulty: 4, instructor: 'Dr. Tal Ben-David',
    description: 'Consensus, replication, consistency models and fault-tolerant service design.',
    schedule: [{ day: 'Mon', start: '10:00', end: '13:00', kind: 'Lecture' }],
    topics: ['Consensus', 'Replication', 'Consistency'],
  },
  {
    id: 'CS440', code: 'CS 440', name: 'Cybersecurity Fundamentals', credits: 3, category: 'elective', mandatory: false,
    prerequisites: ['CS240'], offered: ['spring'], workload: 7, difficulty: 3, instructor: 'Dr. Amir Shalev',
    description: 'Threat modeling, web and systems vulnerabilities, and defensive engineering.',
    schedule: [{ day: 'Tue', start: '15:00', end: '18:00', kind: 'Lecture' }],
    topics: ['Threat modeling', 'Web security', 'Hardening'],
  },
  {
    id: 'CS441', code: 'CS 441', name: 'Applied Cryptography', credits: 3, category: 'elective', mandatory: false,
    prerequisites: ['MATH110', 'CS240'], offered: ['spring'], workload: 7, difficulty: 3, instructor: 'Prof. Ilana Mor',
    description: 'Symmetric and public-key primitives, protocols, and how real systems use them.',
    schedule: [{ day: 'Thu', start: '14:00', end: '17:00', kind: 'Lecture' }],
    topics: ['Public-key crypto', 'Protocols', 'TLS'],
  },
  {
    id: 'CS450', code: 'CS 450', name: 'Natural Language Processing', credits: 4, category: 'elective', mandatory: false,
    prerequisites: ['CS410'], offered: ['spring'], workload: 10, difficulty: 4, instructor: 'Dr. Maya Sela',
    description: 'Language models, sequence modeling, transformers and evaluation.',
    schedule: [{ day: 'Mon', start: '11:00', end: '14:00', kind: 'Lecture' }],
    topics: ['Transformers', 'Language models', 'Evaluation'],
  },
  {
    id: 'CS460', code: 'CS 460', name: 'Cloud Computing', credits: 3, category: 'elective', mandatory: false,
    prerequisites: ['CS240'], offered: ['fall', 'summer'], workload: 7, difficulty: 3, instructor: 'Dr. Eitan Bar',
    description: 'Virtualization, containers, orchestration and cost-aware cloud architecture.',
    schedule: [{ day: 'Sun', start: '16:00', end: '19:00', kind: 'Lecture' }],
    topics: ['Containers', 'Kubernetes', 'Serverless'],
  },
  {
    id: 'CS470', code: 'CS 470', name: 'Compilers', credits: 4, category: 'elective', mandatory: false,
    prerequisites: ['CS250', 'CS202'], offered: ['fall'], workload: 11, difficulty: 5, instructor: 'Prof. Ilana Mor',
    description: 'Lexing, parsing, type checking, intermediate representations and code generation.',
    schedule: [{ day: 'Mon', start: '09:00', end: '12:00', kind: 'Lecture' }],
    topics: ['Parsing', 'Type systems', 'Code generation'],
  },
  {
    id: 'CS480', code: 'CS 480', name: 'Reinforcement Learning', credits: 3, category: 'elective', mandatory: false,
    prerequisites: ['CS410'], offered: ['spring'], workload: 8, difficulty: 4, instructor: 'Prof. Omer Harel',
    description: 'Markov decision processes, value-based and policy-gradient methods.',
    schedule: [{ day: 'Wed', start: '10:00', end: '13:00', kind: 'Lecture' }],
    topics: ['MDPs', 'Q-learning', 'Policy gradients'],
  },
  {
    id: 'CS490', code: 'CS 490', name: 'Quantum Computing', credits: 3, category: 'elective', mandatory: false,
    prerequisites: ['MATH120'], offered: ['fall'], workload: 8, difficulty: 4, instructor: 'Dr. Dana Erez',
    description: 'Qubits, quantum circuits, and the algorithms of Shor and Grover.',
    schedule: [{ day: 'Tue', start: '10:00', end: '13:00', kind: 'Lecture' }],
    topics: ['Qubits', 'Circuits', 'Grover'],
  },

  // ── Final project ─────────────────────────────────────────────────────────
  {
    id: 'PRJ401', code: 'PRJ 401', name: 'Final Project — Part A', credits: 4, category: 'project', mandatory: true,
    prerequisites: ['CS220'], offered: ['fall', 'spring'], workload: 9, difficulty: 3, instructor: 'Dr. Shira Alon',
    description: 'Problem definition, research and design of the capstone project, ending with a design review.',
    schedule: [{ day: 'Wed', start: '16:00', end: '18:00', kind: 'Seminar' }],
    topics: ['Proposal', 'Design review', 'Research'],
  },
  {
    id: 'PRJ402', code: 'PRJ 402', name: 'Final Project — Part B', credits: 4, category: 'project', mandatory: true,
    prerequisites: ['PRJ401'], offered: ['spring', 'summer'], workload: 10, difficulty: 3, instructor: 'Dr. Shira Alon',
    description: 'Implementation, evaluation and public presentation of the capstone project.',
    schedule: [{ day: 'Wed', start: '16:00', end: '18:00', kind: 'Seminar' }],
    topics: ['Implementation', 'Evaluation', 'Presentation'],
  },

  // ── Additional requirements ───────────────────────────────────────────────
  {
    id: 'GEN101', code: 'GEN 101', name: 'Academic English — Advanced', credits: 2, category: 'general', mandatory: true,
    prerequisites: [], offered: ['fall', 'spring'], workload: 4, difficulty: 1, instructor: 'Ms. Ruth Klein',
    description: 'Reading and writing academic English at the advanced level required for graduation.',
    schedule: [{ day: 'Thu', start: '16:00', end: '18:00', kind: 'Seminar' }],
    topics: ['Academic reading', 'Writing'],
  },
  {
    id: 'GEN110', code: 'GEN 110', name: 'Scientific Writing', credits: 2, category: 'general', mandatory: false,
    prerequisites: [], offered: ['spring'], workload: 4, difficulty: 1, instructor: 'Ms. Ruth Klein',
    description: 'Structuring technical arguments, papers and reports.',
    schedule: [{ day: 'Sun', start: '16:00', end: '18:00', kind: 'Seminar' }],
    topics: ['Technical writing', 'Citations'],
  },
  {
    id: 'GEN120', code: 'GEN 120', name: 'Philosophy of Science', credits: 2, category: 'general', mandatory: false,
    prerequisites: [], offered: ['fall'], workload: 4, difficulty: 2, instructor: 'Dr. Ari Navon',
    description: 'Explanation, evidence and theory change in the sciences.',
    schedule: [{ day: 'Wed', start: '16:00', end: '18:00', kind: 'Seminar' }],
    topics: ['Epistemology', 'Scientific method'],
  },
  {
    id: 'GEN130', code: 'GEN 130', name: 'Entrepreneurship & Innovation', credits: 3, category: 'general', mandatory: false,
    prerequisites: [], offered: ['spring'], workload: 5, difficulty: 2, instructor: 'Mr. Yuval Dror',
    description: 'From problem discovery to venture building, with a team pitch project.',
    schedule: [{ day: 'Thu', start: '17:00', end: '20:00', kind: 'Seminar' }],
    topics: ['Venture building', 'Pitching'],
  },
  {
    id: 'GEN150', code: 'GEN 150', name: 'Behavioral Economics', credits: 3, category: 'general', mandatory: false,
    prerequisites: [], offered: ['fall'], workload: 5, difficulty: 2, instructor: 'Dr. Hila Oren',
    description: 'Biases, heuristics and decision-making in markets and products.',
    schedule: [{ day: 'Sun', start: '17:00', end: '20:00', kind: 'Lecture' }],
    topics: ['Decision making', 'Biases'],
  },
  {
    id: 'GEN210', code: 'GEN 210', name: 'Ethics in Computing', credits: 2, category: 'general', mandatory: true,
    prerequisites: [], offered: ['fall'], workload: 4, difficulty: 1, instructor: 'Dr. Ari Navon',
    description: 'Privacy, fairness, accountability and the social impact of software.',
    schedule: [{ day: 'Thu', start: '14:00', end: '16:00', kind: 'Seminar' }],
    topics: ['Privacy', 'Fairness', 'Accountability'],
  },
];

export const courseById = Object.fromEntries(courses.map((c) => [c.id, c])) as Record<string, Course>;

/** Final grades for completed courses (0–100 scale). */
export const grades: Record<string, number> = {
  CS101: 92, MATH101: 83, MATH110: 87, GEN101: 96,
  CS102: 88, CS201: 85, MATH102: 78, GEN110: 91,
  CS202: 81, CS210: 84, MATH120: 80, GEN120: 88,
  CS220: 93, CS230: 90, CS340: 95, GEN130: 94,
  CS240: 86, CS350: 94, MATH201: 82, GEN150: 90,
  CS250: 79, CS360: 89,
};

/**
 * Where each course sits in the student's plan. Courses absent from this map are unscheduled.
 * Numerical Analysis (MATH301) is intentionally unscheduled: it is the "missing requirement" in the demo.
 */
export const initialPlacements: Record<string, string> = {
  CS101: 'F23', MATH101: 'F23', MATH110: 'F23', GEN101: 'F23',
  CS102: 'S24', CS201: 'S24', MATH102: 'S24', GEN110: 'S24',
  CS202: 'F24', CS210: 'F24', MATH120: 'F24', GEN120: 'F24',
  CS220: 'S25', CS230: 'S25', CS340: 'S25', GEN130: 'S25',
  CS240: 'F25', CS350: 'F25', MATH201: 'F25', GEN150: 'F25',
  CS250: 'S26', CS360: 'S26',
  // Current semester — in progress
  CS310: 'F26', PRJ401: 'F26', CS410: 'F26', CS420: 'F26', GEN210: 'F26',
  // Next semester — planned
  CS320: 'S27', PRJ402: 'S27', CS430: 'S27', CS440: 'S27',
};
