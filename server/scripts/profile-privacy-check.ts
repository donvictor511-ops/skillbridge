// Privacy, ownership, invalid-data, and not-found tests for the profile API.
//
// 1. Start the API:           npm run dev            (in server/)
// 2. In another terminal:     npm run test:privacy   (in server/)
//
// It talks to the API like any other client (or attacker) would. It never
// uses the React app. Formal automated tests (Vitest and Supertest) come in
// Part 13.

const BASE = process.env.API_BASE ?? "http://localhost:4000/api/v1";
const RUN_ID = Date.now();
const PASSWORD = "blue-river-lamp-seven";
const FAKE_ID = "00000000-0000-4000-8000-000000000000";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` (${detail})` : ""}`);
  }
}

function section(title: string): void {
  console.log(`\n== ${title} ==`);
}

// ---------------------------------------------------------------- JSON helpers

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getProp(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function getString(value: unknown, ...path: string[]): string {
  let current: unknown = value;
  for (const key of path) {
    current = getProp(current, key);
  }
  return typeof current === "string" ? current : "";
}

function getKeys(value: unknown): string[] {
  return isRecord(value) ? Object.keys(value).sort() : [];
}

function sameKeys(value: unknown, expected: readonly string[]): boolean {
  const actual = getKeys(value);
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

// ------------------------------------------------------------------ API client

interface ApiResponse {
  status: number;
  text: string;
  json: unknown;
  headers: Headers;
}

interface RawBody {
  text: string;
  contentType: string;
}

// One "person": it keeps its own session cookie, like a browser would.
class ApiClient {
  private sessionToken: string | null = null;

  async request(
    method: string,
    path: string,
    body?: unknown,
    rawBody?: RawBody,
  ): Promise<ApiResponse> {
    const headers: Record<string, string> = {};
    let payload: string | undefined;

    if (rawBody) {
      headers["Content-Type"] = rawBody.contentType;
      payload = rawBody.text;
    } else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }

    if (this.sessionToken) {
      headers.Cookie = `sb_session=${this.sessionToken}`;
    }

    const response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: payload,
    });

    // Remember (or forget) the session cookie the server sent.
    for (const cookie of response.headers.getSetCookie()) {
      const match = /^sb_session=([^;]*)/.exec(cookie);
      if (match) {
        this.sessionToken = match[1] ? match[1] : null;
      }
    }

    const text = await response.text();
    let json: unknown = null;
    try {
      json = text === "" ? null : JSON.parse(text);
    } catch {
      json = null;
    }

    return { status: response.status, text, json, headers: response.headers };
  }
}

function errorCode(response: ApiResponse): string {
  return getString(response.json, "error", "code");
}

function profileOf(response: ApiResponse): unknown {
  return getProp(getProp(response.json, "data"), "profile");
}

function isNoStore(response: ApiResponse): boolean {
  return (response.headers.get("cache-control") ?? "").includes("no-store");
}

// check that a response has the status (and optionally the error code)
function expectResponse(
  name: string,
  response: ApiResponse,
  status: number,
  code?: string,
): void {
  const statusOk = response.status === status;
  const codeOk = code === undefined || errorCode(response) === code;
  check(
    name,
    statusOk && codeOk,
    `status ${response.status}${code ? `, code "${errorCode(response)}"` : ""}`,
  );
}

// ----------------------------------------------------------------- field lists

const PUBLIC_KEYS = [
  "userId",
  "displayName",
  "headline",
  "location",
  "bio",
  "avatarUrl",
  "coverUrl",
  "accountTypes",
  "interests",
  "skills",
  "experiences",
  "education",
  "projects",
  "business",
] as const;

const OWNER_KEYS = [
  ...PUBLIC_KEYS,
  "visibility",
  "goals",
  "createdAt",
  "updatedAt",
] as const;

const SKILL_KEYS = ["id", "name", "projectCount"] as const;
const EXPERIENCE_KEYS = [
  "id",
  "title",
  "company",
  "location",
  "startDate",
  "endDate",
  "description",
] as const;
const EDUCATION_KEYS = [
  "id",
  "school",
  "degree",
  "fieldOfStudy",
  "startYear",
  "endYear",
  "description",
] as const;
const PROJECT_KEYS = [
  "id",
  "title",
  "description",
  "projectUrl",
  "imageUrl",
  "skills",
] as const;
const PROJECT_SKILL_KEYS = ["id", "name"] as const;

// Words that must NEVER appear in what a visitor receives.
const FORBIDDEN_WORDS = [
  "goals",
  "visibility",
  "createdAt",
  "updatedAt",
  "onboardedAt",
  "password",
  "passwordHash",
  "tokenHash",
  "sb_session",
] as const;

function allItemsHaveKeys(items: unknown[], keys: readonly string[]): boolean {
  return items.every((item) => sameKeys(item, keys));
}

// Checks that a visitor-facing profile has exactly the promised fields.
function checkPublicShape(
  label: string,
  response: ApiResponse,
  ownerEmail: string,
): void {
  const profile = profileOf(response);

  check(
    `${label}: has exactly the public fields`,
    sameKeys(profile, PUBLIC_KEYS),
    `keys: ${getKeys(profile).join(", ")}`,
  );
  check(
    `${label}: every skill has exactly id, name, projectCount`,
    allItemsHaveKeys(asArray(getProp(profile, "skills")), SKILL_KEYS),
  );
  check(
    `${label}: every experience has exactly the public fields`,
    allItemsHaveKeys(asArray(getProp(profile, "experiences")), EXPERIENCE_KEYS),
  );
  check(
    `${label}: every education entry has exactly the public fields`,
    allItemsHaveKeys(asArray(getProp(profile, "education")), EDUCATION_KEYS),
  );

  const projects = asArray(getProp(profile, "projects"));
  check(
    `${label}: every project has exactly the public fields`,
    allItemsHaveKeys(projects, PROJECT_KEYS),
  );
  check(
    `${label}: every project skill has exactly id and name`,
    projects.every((project) =>
      allItemsHaveKeys(asArray(getProp(project, "skills")), PROJECT_SKILL_KEYS),
    ),
  );

  const leaked = FORBIDDEN_WORDS.filter((word) =>
    response.text.toLowerCase().includes(word.toLowerCase()),
  );
  check(
    `${label}: the raw response has no private words`,
    leaked.length === 0,
    `found: ${leaked.join(", ")}`,
  );
  check(
    `${label}: the owner's email address is not in the response`,
    !response.text.includes(ownerEmail),
  );
}

// ------------------------------------------------------------------- set-up

interface TestUser {
  client: ApiClient;
  email: string;
  id: string;
}

async function registerUser(label: string): Promise<TestUser> {
  const client = new ApiClient();
  const email = `priv-${label}-${RUN_ID}@example.com`;
  const response = await client.request("POST", "/auth/register", {
    email,
    password: PASSWORD,
  });
  const id = getString(response.json, "data", "user", "id");

  check(
    `register user ${label}`,
    response.status === 201 && id !== "",
    `status ${response.status}`,
  );
  return { client, email, id };
}

async function onboardProfessional(
  user: TestUser,
  displayName: string,
  skills: string[],
): Promise<void> {
  const response = await user.client.request("POST", "/onboarding", {
    capabilities: ["professional"],
    displayName,
    headline: "Software engineer",
    location: "Lagos",
    skills,
    interests: ["software-development"],
    goals: ["find-work", "grow-network"],
  });
  check(
    `onboard ${displayName}`,
    response.status === 201,
    `status ${response.status}`,
  );
}

async function main(): Promise<void> {
  const stranger = new ApiClient();

  const health = await stranger.request("GET", "/health");
  if (health.status !== 200) {
    console.log(`Cannot reach the API at ${BASE} (status ${health.status}).`);
    console.log("Start it first with: npm run dev");
    process.exit(1);
  }
  console.log(`Testing ${BASE}`);

  // =========================================================== 1. set-up
  section("1. Set up the people");

  // A: the profile owner. Fully filled in.
  const a = await registerUser("a");
  await onboardProfessional(a, "Ada Lovelace", ["React", "TypeScript"]);

  const patchA = await a.client.request("PATCH", "/profiles/me", {
    bio: "I build calm, reliable software.",
    avatarUrl: "https://example.com/ada.png",
    coverUrl: "https://example.com/cover.png",
  });
  check("fill in A's basics", patchA.status === 200, `status ${patchA.status}`);

  const meBeforeEntries = await a.client.request("GET", "/profiles/me");
  const skillIds = asArray(getProp(profileOf(meBeforeEntries), "skills")).map(
    (skill) => getString(skill, "id"),
  );

  const addExperience = await a.client.request(
    "POST",
    "/profiles/me/experiences",
    {
      title: "Senior Engineer",
      company: "Analytical Engines Ltd",
      startDate: "2023-03",
      endDate: null,
    },
  );
  check("add an experience to A", addExperience.status === 201);

  const addEducation = await a.client.request(
    "POST",
    "/profiles/me/education",
    {
      school: "University of Lagos",
      degree: "BSc",
      startYear: 2016,
      endYear: 2020,
    },
  );
  check("add an education entry to A", addEducation.status === 201);

  const addProject = await a.client.request("POST", "/profiles/me/projects", {
    title: "Savings tracker",
    description: "A mobile-friendly savings app.",
    projectUrl: "https://example.com/savings",
    skillIds,
  });
  check("add a project to A", addProject.status === 201);

  const ownerView = await a.client.request("GET", "/profiles/me");
  const ownerProfile = profileOf(ownerView);
  const experienceId = getString(
    asArray(getProp(ownerProfile, "experiences"))[0],
    "id",
  );
  const educationId = getString(
    asArray(getProp(ownerProfile, "education"))[0],
    "id",
  );
  const projectId = getString(
    asArray(getProp(ownerProfile, "projects"))[0],
    "id",
  );
  check(
    "A has an experience, an education entry, and a project",
    experienceId !== "" && educationId !== "" && projectId !== "",
  );

  // B: another member (a professional).
  const b = await registerUser("b");
  await onboardProfessional(b, "Bea Builder", ["Python"]);

  // C: a client account with company details.
  const c = await registerUser("c");
  const onboardC = await c.client.request("POST", "/onboarding", {
    capabilities: ["client"],
    displayName: "Acme",
    skills: [],
    interests: [],
    goals: ["hire-talent"],
  });
  check("onboard C (a client)", onboardC.status === 201);
  const businessC = await c.client.request("PUT", "/profiles/me/business", {
    companyName: "Acme Ltd",
    websiteUrl: "https://example.com",
    sizeRange: "11-50",
  });
  check("save C's company details", businessC.status === 200);

  // E: registered but never finished onboarding (so: no profile).
  const e = await registerUser("e");

  // ===================================================== 2. visibility matrix
  section("2. Who can see a profile (public, members, private)");

  interface Row {
    visibility: "public" | "members" | "private";
    visitor: number;
    member: number;
    owner: number;
  }

  const matrix: Row[] = [
    { visibility: "public", visitor: 200, member: 200, owner: 200 },
    { visibility: "members", visitor: 401, member: 200, owner: 200 },
    { visibility: "private", visitor: 404, member: 404, owner: 200 },
  ];

  for (const row of matrix) {
    const set = await a.client.request("PATCH", "/profiles/me", {
      visibility: row.visibility,
    });
    check(`set A's profile to ${row.visibility}`, set.status === 200);

    const asVisitor = await stranger.request("GET", `/profiles/${a.id}`);
    const asMember = await b.client.request("GET", `/profiles/${a.id}`);
    const asOwner = await a.client.request("GET", `/profiles/${a.id}`);

    expectResponse(
      `${row.visibility}: logged-out visitor gets ${row.visitor}`,
      asVisitor,
      row.visitor,
    );
    expectResponse(
      `${row.visibility}: another member gets ${row.member}`,
      asMember,
      row.member,
    );
    expectResponse(
      `${row.visibility}: the owner gets ${row.owner}`,
      asOwner,
      row.owner,
    );

    if (row.visibility === "members") {
      check(
        "members: the visitor is told LOGIN_REQUIRED",
        errorCode(asVisitor) === "LOGIN_REQUIRED",
      );
    }
    if (row.visibility === "private") {
      check(
        "private: the visitor is told PROFILE_NOT_FOUND",
        errorCode(asVisitor) === "PROFILE_NOT_FOUND",
      );
      check(
        "private: the member is told PROFILE_NOT_FOUND",
        errorCode(asMember) === "PROFILE_NOT_FOUND",
      );
    }

    // What the 200 responses contain (the exact list of fields).
    if (asMember.status === 200) {
      checkPublicShape(`${row.visibility} (member view)`, asMember, a.email);
    }
    if (row.visibility === "public" && asVisitor.status === 200) {
      checkPublicShape("public (visitor view)", asVisitor, a.email);
    }
  }

  // While A is private: a private profile must look EXACTLY like a missing one.
  const privateVisitor = await stranger.request("GET", `/profiles/${a.id}`);
  const missingVisitor = await stranger.request("GET", `/profiles/${FAKE_ID}`);
  check(
    "private and missing profiles give the SAME answer to a visitor",
    privateVisitor.status === missingVisitor.status &&
      privateVisitor.text === missingVisitor.text,
  );
  const privateMember = await b.client.request("GET", `/profiles/${a.id}`);
  const missingMember = await b.client.request("GET", `/profiles/${FAKE_ID}`);
  check(
    "private and missing profiles give the SAME answer to a member",
    privateMember.status === missingMember.status &&
      privateMember.text === missingMember.text,
  );

  // Put A back to members-only (the default) for the rest.
  await a.client.request("PATCH", "/profiles/me", { visibility: "members" });

  // ===================================================== 3. what the owner sees
  section("3. The owner view");

  const ownerAgain = await a.client.request("GET", "/profiles/me");
  check(
    "the owner view has the public fields plus visibility, goals, and timestamps",
    sameKeys(profileOf(ownerAgain), OWNER_KEYS),
    `keys: ${getKeys(profileOf(ownerAgain)).join(", ")}`,
  );
  check(
    "the owner view does not contain the email address",
    !ownerAgain.text.includes(a.email),
  );

  const visitorMe = await stranger.request("GET", "/profiles/me");
  expectResponse(
    "/profiles/me without a login -> 401",
    visitorMe,
    401,
    "UNAUTHENTICATED",
  );

  // C is a client: a visitor can see the company details (once public).
  await c.client.request("PATCH", "/profiles/me", { visibility: "public" });
  const viewC = await stranger.request("GET", `/profiles/${c.id}`);
  check(
    "a client's company details are shown to visitors",
    getString(profileOf(viewC), "business", "companyName") === "Acme Ltd",
  );
  const viewAOwnerBusiness = getProp(profileOf(ownerAgain), "business");
  check(
    "a professional account has no company details",
    viewAOwnerBusiness === null,
  );

  // ============================================================ 4. attacks
  section("4. User B tries to change user A's profile");

  const beforeAttack = await a.client.request("GET", "/profiles/me");

  const validJob = {
    title: "Hacked",
    company: "Evil Co",
    startDate: "2020-01",
  };
  const validSchool = { school: "Hacked University" };
  const validProject = { title: "Hacked", description: "Hacked." };

  expectResponse(
    "B cannot replace A's experience",
    await b.client.request(
      "PUT",
      `/profiles/me/experiences/${experienceId}`,
      validJob,
    ),
    404,
    "EXPERIENCE_NOT_FOUND",
  );
  expectResponse(
    "B cannot delete A's experience",
    await b.client.request(
      "DELETE",
      `/profiles/me/experiences/${experienceId}`,
    ),
    404,
    "EXPERIENCE_NOT_FOUND",
  );
  expectResponse(
    "B cannot replace A's education",
    await b.client.request(
      "PUT",
      `/profiles/me/education/${educationId}`,
      validSchool,
    ),
    404,
    "EDUCATION_NOT_FOUND",
  );
  expectResponse(
    "B cannot delete A's education",
    await b.client.request("DELETE", `/profiles/me/education/${educationId}`),
    404,
    "EDUCATION_NOT_FOUND",
  );
  expectResponse(
    "B cannot replace A's project",
    await b.client.request(
      "PUT",
      `/profiles/me/projects/${projectId}`,
      validProject,
    ),
    404,
    "PROJECT_NOT_FOUND",
  );
  expectResponse(
    "B cannot delete A's project",
    await b.client.request("DELETE", `/profiles/me/projects/${projectId}`),
    404,
    "PROJECT_NOT_FOUND",
  );
  expectResponse(
    "B (a professional) cannot save company details",
    await b.client.request("PUT", "/profiles/me/business", {
      companyName: "Evil Co",
    }),
    403,
    "NOT_A_BUSINESS_ACCOUNT",
  );

  // B names A in the body. It must only ever change B's own profile.
  const sneaky = await b.client.request("PATCH", "/profiles/me", {
    headline: "Changed by B",
    userId: a.id,
    id: a.id,
    email: "stolen@example.com",
    capabilities: ["client"],
    visibility: "public",
  });
  check(
    "B's PATCH with A's id in the body works on B only",
    sneaky.status === 200,
  );
  check(
    "B's own profile changed",
    getString(profileOf(sneaky), "headline") === "Changed by B",
  );
  check(
    "B did not become a client (capabilities in the body are ignored)",
    asArray(getProp(profileOf(sneaky), "accountTypes")).join(",") ===
      "professional",
  );

  const afterAttack = await a.client.request("GET", "/profiles/me");
  check(
    "A's profile is IDENTICAL after every attack (byte for byte)",
    beforeAttack.text === afterAttack.text && afterAttack.status === 200,
  );

  section("5. Logged-out visitors cannot write anything");

  const writes: Array<[string, string, unknown]> = [
    ["PATCH", "/profiles/me", { headline: "x" }],
    ["PUT", "/profiles/me/skills", { skills: ["x"] }],
    ["POST", "/profiles/me/experiences", validJob],
    ["PUT", `/profiles/me/experiences/${experienceId}`, validJob],
    ["DELETE", `/profiles/me/experiences/${experienceId}`, undefined],
    ["POST", "/profiles/me/education", validSchool],
    ["PUT", `/profiles/me/education/${educationId}`, validSchool],
    ["DELETE", `/profiles/me/education/${educationId}`, undefined],
    ["POST", "/profiles/me/projects", validProject],
    ["PUT", `/profiles/me/projects/${projectId}`, validProject],
    ["DELETE", `/profiles/me/projects/${projectId}`, undefined],
    ["PUT", "/profiles/me/business", { companyName: "x" }],
    ["DELETE", "/profiles/me/business", undefined],
  ];
  for (const [method, path, body] of writes) {
    expectResponse(
      `${method} ${path.replace(/[0-9a-f-]{36}/, ":id")} without a login -> 401`,
      await stranger.request(method, path, body),
      401,
      "UNAUTHENTICATED",
    );
  }

  // ========================================================= 6. invalid data
  section("6. Invalid and nasty input");

  async function patchAs(body: unknown, raw?: RawBody): Promise<ApiResponse> {
    return a.client.request("PATCH", "/profiles/me", body, raw);
  }

  expectResponse(
    "a name sent as a number -> 400",
    await patchAs({ displayName: 123 }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "an unknown visibility -> 400",
    await patchAs({ visibility: "everyone" }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "interests sent as text, not a list -> 400",
    await patchAs({ interests: "software-development" }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "an unknown interest -> 400",
    await patchAs({ interests: ["cooking"] }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "no goals -> 400",
    await patchAs({ goals: [] }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "a headline over 120 characters -> 400",
    await patchAs({ headline: "x".repeat(121) }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "a bio over 2000 characters -> 400",
    await patchAs({ bio: "x".repeat(2001) }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "a javascript: photo link -> 400",
    await patchAs({ avatarUrl: "javascript:alert(1)" }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "a http:// photo link -> 400",
    await patchAs({ avatarUrl: "http://example.com/a.png" }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "a link with a password inside -> 400",
    await patchAs({ coverUrl: "https://user:secret@example.com/a.png" }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "an empty update -> 400",
    await patchAs({}),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "a JSON list instead of an object -> 400",
    await patchAs([]),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "the JSON value null -> 400",
    await patchAs(undefined, { text: "null", contentType: "application/json" }),
    400,
  );
  expectResponse(
    "broken JSON -> 400 INVALID_JSON",
    await patchAs(undefined, {
      text: "{bad json",
      contentType: "application/json",
    }),
    400,
    "INVALID_JSON",
  );
  expectResponse(
    "a body sent as plain text -> 400",
    await patchAs(undefined, {
      text: '{"headline":"x"}',
      contentType: "text/plain",
    }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "a body over 10 KB -> 413",
    await patchAs({ bio: "x".repeat(12000) }),
    413,
    "PAYLOAD_TOO_LARGE",
  );

  const sixteenSkills = Array.from(
    { length: 16 },
    (_, index) => `Skill ${index}`,
  );
  expectResponse(
    "16 skills -> 400",
    await a.client.request("PUT", "/profiles/me/skills", {
      skills: sixteenSkills,
    }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "a skill with HTML in it -> 400",
    await a.client.request("PUT", "/profiles/me/skills", {
      skills: ["<b>bold</b>"],
    }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "a skill name over 40 characters -> 400",
    await a.client.request("PUT", "/profiles/me/skills", {
      skills: ["x".repeat(41)],
    }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "a job title sent as a number -> 400",
    await a.client.request("POST", "/profiles/me/experiences", {
      title: 5,
      company: "x",
      startDate: "2020-01",
    }),
    400,
    "VALIDATION_ERROR",
  );
  expectResponse(
    "a school year sent as text -> 400",
    await a.client.request("POST", "/profiles/me/education", {
      school: "x",
      startYear: "2016",
    }),
    400,
    "VALIDATION_ERROR",
  );

  // The hidden control character (code 0). We expect a clean 400, never a 500.
  const nullChar = await patchAs({ headline: "a\u0000b" });
  check(
    "a null character (code 0) in text is rejected with 400, not 500",
    nullChar.status === 400,
    `status ${nullChar.status}`,
  );
  const nullCharDeep = await a.client.request(
    "POST",
    "/profiles/me/experiences",
    {
      title: "ok",
      company: "ok",
      startDate: "2020-01",
      description: "hidden \u0000 character",
    },
  );
  check(
    "a null character inside another endpoint is also rejected with 400",
    nullCharDeep.status === 400,
    `status ${nullCharDeep.status}`,
  );

  // Harmless but unusual text must work, and be treated as plain text.
  const emoji = await patchAs({ headline: "José 🚀 日本語" });
  check("emoji and non-English letters are accepted", emoji.status === 200);
  check(
    "and they come back unchanged",
    getString(profileOf(emoji), "headline") === "José 🚀 日本語",
  );

  const scriptText = '<script>alert("x")</script>';
  const script = await patchAs({ bio: scriptText });
  check("script text is accepted as plain text", script.status === 200);
  check(
    "and it is returned unchanged (React shows it as text, it never runs)",
    getString(profileOf(script), "bio") === scriptText,
  );
  check(
    "and the response is declared as JSON, not HTML",
    (script.headers.get("content-type") ?? "").startsWith("application/json"),
  );

  // ====================================================== 7. not-found states
  section("7. Not-found states");

  expectResponse(
    "a malformed id -> 404",
    await b.client.request("GET", "/profiles/not-a-uuid"),
    404,
    "PROFILE_NOT_FOUND",
  );
  expectResponse(
    "an unknown id -> 404",
    await b.client.request("GET", `/profiles/${FAKE_ID}`),
    404,
    "PROFILE_NOT_FOUND",
  );
  expectResponse(
    "a very long id -> 404",
    await b.client.request("GET", `/profiles/${"x".repeat(500)}`),
    404,
    "PROFILE_NOT_FOUND",
  );
  expectResponse(
    "a user who never finished onboarding has no profile page -> 404",
    await b.client.request("GET", `/profiles/${e.id}`),
    404,
    "PROFILE_NOT_FOUND",
  );

  expectResponse(
    "E's own profile does not exist yet -> 404",
    await e.client.request("GET", "/profiles/me"),
    404,
    "PROFILE_NOT_FOUND",
  );
  expectResponse(
    "E cannot edit a profile that does not exist -> 404",
    await e.client.request("PATCH", "/profiles/me", { headline: "x" }),
    404,
    "PROFILE_NOT_FOUND",
  );
  expectResponse(
    "E cannot add a job -> 404",
    await e.client.request("POST", "/profiles/me/experiences", validJob),
    404,
    "PROFILE_NOT_FOUND",
  );
  expectResponse(
    "E cannot add a project -> 404",
    await e.client.request("POST", "/profiles/me/projects", validProject),
    404,
    "PROFILE_NOT_FOUND",
  );
  expectResponse(
    "E cannot set skills -> 404",
    await e.client.request("PUT", "/profiles/me/skills", { skills: ["x"] }),
    404,
    "PROFILE_NOT_FOUND",
  );

  // ====================================================== 8. cache headers
  section("8. Profile answers must never be cached");

  const cacheChecks: Array<[string, ApiResponse]> = [
    ["an owner profile (200)", await a.client.request("GET", "/profiles/me")],
    [
      "a visitor profile (200)",
      await b.client.request("GET", `/profiles/${c.id}`),
    ],
    [
      "a members-only profile for a visitor (401)",
      await stranger.request("GET", `/profiles/${a.id}`),
    ],
    [
      "a missing profile (404)",
      await b.client.request("GET", `/profiles/${FAKE_ID}`),
    ],
    ["a rejected edit (400)", await patchAs({ visibility: "everyone" })],
    [
      "an edit without a login (401)",
      await stranger.request("PATCH", "/profiles/me", { headline: "x" }),
    ],
    [
      "an edit of someone else's entry (404)",
      await b.client.request("DELETE", `/profiles/me/projects/${projectId}`),
    ],
  ];
  for (const [label, response] of cacheChecks) {
    check(
      `${label} is marked no-store`,
      isNoStore(response),
      `status ${response.status}`,
    );
  }

  // ====================================================== 9. logout
  section("9. After logout");

  const logout = await b.client.request("POST", "/auth/logout");
  check("B logs out", logout.status === 204, `status ${logout.status}`);
  expectResponse(
    "/profiles/me after logout -> 401",
    await b.client.request("GET", "/profiles/me"),
    401,
    "UNAUTHENTICATED",
  );
  expectResponse(
    "a members-only profile after logout -> 401 LOGIN_REQUIRED",
    await b.client.request("GET", `/profiles/${a.id}`),
    401,
    "LOGIN_REQUIRED",
  );

  // ============================================================== summary
  console.log(`\nPassed: ${passed}    Failed: ${failed}`);
  console.log("\nClean up the test data in SQL Shell:");
  console.log("  DELETE FROM users WHERE email LIKE 'priv-%@example.com';");
  console.log(
    "  DELETE FROM skills WHERE id NOT IN (SELECT skill_id FROM user_skills)",
  );
  console.log(
    "    AND id NOT IN (SELECT skill_id FROM portfolio_project_skills);",
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error("The test script stopped with an error:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
