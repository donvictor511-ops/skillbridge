import { paths } from "../../app/paths";

export interface NavItem {
  label: string;
  to: string;
  // true = highlight only on the exact path (needed for Home, which is "/")
  end?: boolean;
}

export interface FooterLinkGroup {
  title: string;
  links: NavItem[];
}

// Only pages that exist (or belong to Release 1) are listed.
// More links are added as features ship.
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
