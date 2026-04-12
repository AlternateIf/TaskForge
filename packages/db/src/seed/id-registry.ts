/**
 * Stable deterministic ID allocation for all seeded entities.
 *
 * ID ranges are fixed so re-seed produces identical UUIDs.
 * IDs use the format: 00000000-0000-0000-0000-{NNNNNNNNNNNN} (12-digit zero-padded).
 */

function id(num: number): string {
  return `00000000-0000-0000-0000-${num.toString().padStart(12, '0')}`;
}

// ---------------------------------------------------------------------------
// ID range allocation by entity family
// ---------------------------------------------------------------------------

// Users:           1–99
// Organizations:   101–199
// Organization Auth Settings: 151–199
// Roles:           201–399
// Permissions:     1000–5999
// Organization Members: 300–399
// Role Assignments: 3200–3599
// Permission Assignments: 350–399
// Oauth/Sessions/Tokens: 400–499
// Invitations:     430–499
// Invitation Targets: 440–499
// Invitation Target Roles: 450–499
// Invitation Target Permissions: 460–499
// Projects:        501–699
// Workflows:       601–699
// Workflow Statuses: 611–999
// Project Members: 700–799
// Labels:          801–899
// Tasks:           901–999 + 10001–11200
// Task Labels:     11001–11500
// Task Watchers:   12001–12220
// Task Dependencies: 13001–13091
// Checklists:      14001–14100
// Checklist Items: 14101–14200
// Comments:        15001–15171
// Comment Mentions: 15201–15361
// Activity Log:    16001–16100
// Notification Preferences: 17001–17100
// Notifications:   18001–18121

// ---------------------------------------------------------------------------
// Super user (ID 1)
// ---------------------------------------------------------------------------

export const SUPER_USER_ID = id(1);

// ---------------------------------------------------------------------------
// Organization IDs
// ---------------------------------------------------------------------------

export const ORG_IDS = {
  taskforgeAgency: id(101),
  acmeCorp: id(102),
  globexInc: id(103),
  soylentCorp: id(104),
  umbrellaCorp: id(105),
} as const;

export const ALL_ORG_IDS = Object.values(ORG_IDS);

// ---------------------------------------------------------------------------
// Organization Auth Settings IDs
// ---------------------------------------------------------------------------

export const ORG_AUTH_SETTING_IDS = {
  taskforgeAgency: id(151),
  acmeCorp: id(152),
  globexInc: id(153),
  soylentCorp: id(154),
  umbrellaCorp: id(155),
} as const;

// ---------------------------------------------------------------------------
// Role IDs — global roles (orgId = null)
// ---------------------------------------------------------------------------

export const GLOBAL_ROLE_IDS = {
  superAdmin: id(201),
} as const;

// Per-org role ID bases: each org gets roles at id(210 + orgIndex * 10 + roleOffset)
// TaskForge Agency: 211-219
// Acme Corp: 221-229
// Globex Inc: 231-239
// Soylent Corp: 241-249
// Umbrella Corp: 251-259

export const ORG_ROLE_IDS = {
  taskforgeAgency: {
    owner: id(211),
    projectAdmin: id(212),
    backendDev: id(213),
    frontendDev: id(214),
    designer: id(215),
    seoSpecialist: id(216),
    authFlowManager: id(217),
    qaEngineer: id(218),
    devopsSre: id(219),
    supportEngineer: id(2110),
    productManager: id(2111),
  },
  acmeCorp: {
    owner: id(221),
    projectAdmin: id(222),
    backendDev: id(223),
    frontendDev: id(224),
    designer: id(225),
    qaEngineer: id(226),
    devopsSre: id(227),
    productManager: id(228),
    customerReporter: id(229),
    customerStakeholder: id(2290),
  },
  globexInc: {
    owner: id(231),
    projectAdmin: id(232),
    backendDev: id(233),
    frontendDev: id(234),
    designer: id(235),
    seoSpecialist: id(236),
    productManager: id(237),
    customerReporter: id(238),
    customerStakeholder: id(2390),
  },
  soylentCorp: {
    owner: id(241),
    projectAdmin: id(242),
    backendDev: id(243),
    supportEngineer: id(244),
    customerReporter: id(245),
    customerStakeholder: id(2460),
  },
  umbrellaCorp: {
    owner: id(251),
    projectAdmin: id(252),
    backendDev: id(253),
    qaEngineer: id(254),
    devopsSre: id(255),
    customerReporter: id(256),
    customerStakeholder: id(2570),
  },
} as const;

// ---------------------------------------------------------------------------
// User IDs
// ---------------------------------------------------------------------------

// Super Admin: id(1)
// Org owners: id(2)-id(6)
// Internal delivery (TaskForge Agency staff): id(10)-id(44) = 35 users
// Acme Corp customer users: id(45)-id(55) = 11 users
// Globex Inc customer users: id(56)-id(65) = 10 users
// Soylent Corp customer users: id(66)-id(71) = 6 users
// Umbrella Corp customer users: id(72)-id(77) = 6 users
// Internal cross-org staff shared across customer orgs: id(7)-id(9) = 3 users

export const USER_IDS = {
  // Super admin
  superAdmin: id(1),
  // Org owners
  taskforgeAgencyOwner: id(2),
  acmeCorpOwner: id(3),
  globexIncOwner: id(4),
  soylentCorpOwner: id(5),
  umbrellaCorpOwner: id(6),
  // Shared internal staff (appear in multiple orgs)
  sharedQa: id(7),
  sharedSupport: id(8),
  sharedDevops: id(9),
  // TaskForge Agency internal staff (10–44)
  tfBackendDev1: id(10),
  tfBackendDev2: id(11),
  tfBackendDev3: id(12),
  tfFrontendDev1: id(13),
  tfFrontendDev2: id(14),
  tfFrontendDev3: id(15),
  tfDesigner1: id(16),
  tfDesigner2: id(17),
  tfSeoSpecialist1: id(18),
  tfAuthFlowManager1: id(19),
  tfQaEngineer1: id(20),
  tfQaEngineer2: id(21),
  tfDevopsSre1: id(22),
  tfDevopsSre2: id(23),
  tfSupportEngineer1: id(24),
  tfSupportEngineer2: id(25),
  tfProductManager1: id(26),
  tfBackendDev4: id(27),
  tfBackendDev5: id(28),
  tfFrontendDev4: id(29),
  tfDesigner3: id(30),
  tfSeoSpecialist2: id(31),
  tfAuthFlowManager2: id(32),
  tfQaEngineer3: id(33),
  tfDevopsSre3: id(34),
  tfSupportEngineer3: id(35),
  tfBackendDev6: id(36),
  tfFrontendDev5: id(37),
  tfDesigner4: id(38),
  tfDevopsSre4: id(39),
  tfProductManager2: id(40),
  tfBackendDev7: id(41),
  tfFrontendDev6: id(42),
  tfQaEngineer4: id(43),
  tfSupportEngineer4: id(44),
  // Acme Corp users (45–55)
  acmeBackendDev1: id(45),
  acmeBackendDev2: id(46),
  acmeFrontendDev1: id(47),
  acmeDesigner1: id(48),
  acmeQaEngineer1: id(49),
  acmeDevopsSre1: id(50),
  acmeProductManager1: id(51),
  acmeCustomerReporter1: id(52),
  acmeCustomerReporter2: id(53),
  acmeCustomerStakeholder1: id(54),
  acmeCustomerStakeholder2: id(55),
  // Globex Inc users (56–65)
  globexBackendDev1: id(56),
  globexFrontendDev1: id(57),
  globexDesigner1: id(58),
  globexSeoSpecialist1: id(59),
  globexProductManager1: id(60),
  globexCustomerReporter1: id(61),
  globexCustomerReporter2: id(62),
  globexCustomerStakeholder1: id(63),
  globexCustomerStakeholder2: id(64),
  globexCustomerStakeholder3: id(65),
  // Soylent Corp users (66–71)
  soylentBackendDev1: id(66),
  soylentSupportEngineer1: id(67),
  soylentSupportEngineer2: id(68),
  soylentCustomerReporter1: id(69),
  soylentCustomerReporter2: id(70),
  soylentCustomerStakeholder1: id(71),
  // Umbrella Corp users (72–77)
  umbrellaBackendDev1: id(72),
  umbrellaQaEngineer1: id(73),
  umbrellaDevopsSre1: id(74),
  umbrellaCustomerReporter1: id(75),
  umbrellaCustomerReporter2: id(76),
  umbrellaCustomerStakeholder1: id(77),
  // Additional users to reach 67 (78–85)
  acmeBackendDev3: id(78),
  acmeFrontendDev2: id(79),
  globexBackendDev2: id(80),
  globexFrontendDev2: id(81),
  soylentCustomerReporter3: id(82),
  soylentCustomerStakeholder2: id(83),
  umbrellaCustomerReporter3: id(84),
  umbrellaCustomerStakeholder2: id(85),
} as const;

// ---------------------------------------------------------------------------
// Project IDs
// ---------------------------------------------------------------------------

export const PROJECT_IDS = {
  // TaskForge Agency (501–504)
  tfPlatform: id(501),
  tfSecurityProgram: id(502),
  tfAuthService: id(503),
  tfInfrastructure: id(504),
  // Acme Corp (505–510)
  acmeMobileLaunch: id(505),
  acmePlatformReliability: id(506),
  acmeWebRefresh: id(507),
  acmePaymentGateway: id(508),
  acmeCustomerPortal: id(509),
  acmeApiV2: id(510),
  // Globex Inc (511–515)
  globexCustomerOps: id(511),
  globexSecurityProgram: id(512),
  globexMarketingHub: id(513),
  globexProductCatalog: id(514),
  globexDataPipeline: id(515),
  // Soylent Corp (516–519)
  soylentEnterpriseSupport: id(516),
  soylentMigrationEngine: id(517),
  soylentComplianceSuite: id(518),
  soylentApiGateway: id(519),
  // Umbrella Corp (520–522)
  umbrellaThreatIntel: id(520),
  umbrellaPenTestTracker: id(521),
  umbrellaIncidentResponse: id(522),
} as const;

export const ALL_PROJECT_IDS = Object.values(PROJECT_IDS);

// Map project IDs to their org IDs for builder convenience
export const PROJECT_ORG_MAP: Record<string, string> = {
  [PROJECT_IDS.tfPlatform]: ORG_IDS.taskforgeAgency,
  [PROJECT_IDS.tfSecurityProgram]: ORG_IDS.taskforgeAgency,
  [PROJECT_IDS.tfAuthService]: ORG_IDS.taskforgeAgency,
  [PROJECT_IDS.tfInfrastructure]: ORG_IDS.taskforgeAgency,
  [PROJECT_IDS.acmeMobileLaunch]: ORG_IDS.acmeCorp,
  [PROJECT_IDS.acmePlatformReliability]: ORG_IDS.acmeCorp,
  [PROJECT_IDS.acmeWebRefresh]: ORG_IDS.acmeCorp,
  [PROJECT_IDS.acmePaymentGateway]: ORG_IDS.acmeCorp,
  [PROJECT_IDS.acmeCustomerPortal]: ORG_IDS.acmeCorp,
  [PROJECT_IDS.acmeApiV2]: ORG_IDS.acmeCorp,
  [PROJECT_IDS.globexCustomerOps]: ORG_IDS.globexInc,
  [PROJECT_IDS.globexSecurityProgram]: ORG_IDS.globexInc,
  [PROJECT_IDS.globexMarketingHub]: ORG_IDS.globexInc,
  [PROJECT_IDS.globexProductCatalog]: ORG_IDS.globexInc,
  [PROJECT_IDS.globexDataPipeline]: ORG_IDS.globexInc,
  [PROJECT_IDS.soylentEnterpriseSupport]: ORG_IDS.soylentCorp,
  [PROJECT_IDS.soylentMigrationEngine]: ORG_IDS.soylentCorp,
  [PROJECT_IDS.soylentComplianceSuite]: ORG_IDS.soylentCorp,
  [PROJECT_IDS.soylentApiGateway]: ORG_IDS.soylentCorp,
  [PROJECT_IDS.umbrellaThreatIntel]: ORG_IDS.umbrellaCorp,
  [PROJECT_IDS.umbrellaPenTestTracker]: ORG_IDS.umbrellaCorp,
  [PROJECT_IDS.umbrellaIncidentResponse]: ORG_IDS.umbrellaCorp,
};

// Workflow IDs
export const WORKFLOW_IDS: Record<string, string> = {};
let workflowCounter = 601;
for (const projectId of ALL_PROJECT_IDS) {
  WORKFLOW_IDS[projectId] = id(workflowCounter++);
}

// Workflow status IDs — each workflow gets 4 statuses: To Do, In Progress, Review, Done
export const WORKFLOW_STATUS_IDS: Record<
  string,
  { todo: string; inProgress: string; review: string; done: string }
> = {};
let statusCounter = 611;
for (const projectId of ALL_PROJECT_IDS) {
  WORKFLOW_STATUS_IDS[projectId] = {
    todo: id(statusCounter++),
    inProgress: id(statusCounter++),
    review: id(statusCounter++),
    done: id(statusCounter++),
  };
}

// All workflow status IDs as a flat array for task assignemnt
export const ALL_STATUS_IDS: string[] = [];
for (const statuses of Object.values(WORKFLOW_STATUS_IDS)) {
  ALL_STATUS_IDS.push(statuses.todo, statuses.inProgress, statuses.review, statuses.done);
}

export { id };
