import { paths } from "../../app/paths";

export interface NavItem {
  label: string;
  to: string;
  end?: boolean;
}

export interface FooterLinkGroup {
  title: string;
  links: NavItem[];
}

export const primaryNavItems: NavItem[] = [
  { label: "Home", to: paths.home, end: true },
];

export const footerLinkGroups: FooterLinkGroup[] = [
  {
    title: "SkillBridge",
    links: [{ label: "Home", to: paths.home }],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", to: paths.login },
      { label: "Create an account", to: paths.register },
    ],
  },
];
