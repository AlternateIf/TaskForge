export const ROLE_NAMES = {
  SUPER_ADMIN: 'Super Admin',
  BACKEND_DEVELOPER: 'Backend Developer',
  FRONTEND_DEVELOPER: 'Frontend Developer',
  DESIGNER: 'Designer',
  QA_ENGINEER: 'QA Engineer',
  DEVOPS_SRE: 'DevOps/SRE',
  SUPPORT_ENGINEER: 'Support Engineer',
  PRODUCT_MANAGER: 'Product Manager',
  SEO_SPECIALIST: 'SEO Specialist',
  AUTH_FLOW_MANAGER: 'Auth Flow Manager',
  CUSTOMER_REPORTER: 'Customer Reporter',
  CUSTOMER_STAKEHOLDER: 'Customer Stakeholder',
  ORG_OWNER: 'Org Owner',
  PROJECT_ADMIN: 'Project Admin',
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];
