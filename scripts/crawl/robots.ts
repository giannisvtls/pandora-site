// robots.txt: the `User-agent: *` rules and the `Sitemap:` lines (RFC 9309 matching: the longest
// matching rule wins, Allow wins a tie, `*` matches any run of characters, a final `$` anchors).

export interface RobotsRules {
  readonly sitemaps: string[];
  readonly allow: string[];
  readonly disallow: string[];
  // The largest `Crawl-delay` (seconds) of the `*` groups, or null.
  readonly crawlDelay: number | null;
}

interface Group {
  readonly agents: string[];
  readonly allow: string[];
  readonly disallow: string[];
  readonly crawlDelays: number[];
  hasRules: boolean;
}

const BOM = String.fromCodePoint(0xfe_ff);

// Each `key: value` line without its comment; blank and malformed lines are dropped.
function directives(text: string): { key: string; value: string }[] {
  const body = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  const result: { key: string; value: string }[] = [];
  for (const rawLine of body.split(/\r\n|\r|\n/)) {
    const line = rawLine.split('#', 1)[0] ?? '';
    const colon = line.indexOf(':');
    if (colon !== -1) {
      result.push({
        key: line.slice(0, colon).trim().toLowerCase(),
        value: line.slice(colon + 1).trim(),
      });
    }
  }
  return result;
}

// Consecutive User-agent lines share one group; a User-agent after rules opens a new one.
function groupForAgent(groups: Group[]): Group {
  const current = groups.at(-1);
  if (current?.hasRules === false) {
    return current;
  }
  const group: Group = { agents: [], allow: [], disallow: [], crawlDelays: [], hasRules: false };
  groups.push(group);
  return group;
}

// Adds an Allow, Disallow or Crawl-delay line to its group; other keys are ignored.
function addRule(group: Group, key: string, value: string): void {
  if (key !== 'allow' && key !== 'disallow' && key !== 'crawl-delay') {
    return;
  }
  group.hasRules = true;
  if (key === 'crawl-delay') {
    const seconds = Number(value);
    if (value !== '' && Number.isFinite(seconds) && seconds >= 0) {
      group.crawlDelays.push(seconds);
    }
  } else if (value !== '') {
    // An empty Disallow allows everything: it adds no rule.
    group[key].push(value);
  }
}

function parseGroups(text: string): { groups: Group[]; sitemaps: string[] } {
  const groups: Group[] = [];
  const sitemaps: string[] = [];
  for (const { key, value } of directives(text)) {
    const current = groups.at(-1);
    if (key === 'user-agent') {
      groupForAgent(groups).agents.push(value.toLowerCase());
    } else if (key === 'sitemap' && value !== '') {
      sitemaps.push(value);
    } else if (current !== undefined) {
      addRule(current, key, value);
    }
  }
  return { groups, sitemaps };
}

export function parseRobots(text: string): RobotsRules {
  const { groups, sitemaps } = parseGroups(text);
  const star = groups.filter((group) => group.agents.includes('*'));
  const delays = star.flatMap((group) => group.crawlDelays);
  return {
    sitemaps,
    allow: star.flatMap((group) => group.allow),
    disallow: star.flatMap((group) => group.disallow),
    crawlDelay: delays.length > 0 ? Math.max(...delays) : null,
  };
}

// Percent-escapes compare case-insensitively; raw non-ASCII in a rule is compared encoded.
function normalizePath(path: string): string {
  return path
    .replaceAll(/[^\p{ASCII}]+/gu, (run) => encodeURIComponent(run))
    .replaceAll(/%[\da-f]{2}/gi, (escape) => escape.toUpperCase());
}

interface CompiledRule {
  readonly length: number;
  readonly isAllow: boolean;
  readonly pattern: RegExp;
}

function compileRule(rule: string, isAllow: boolean): CompiledRule {
  const normalized = normalizePath(rule);
  const isAnchored = normalized.endsWith('$');
  const body = isAnchored ? normalized.slice(0, -1) : normalized;
  const source = body
    .split('*')
    .map((part) => part.replaceAll(/[$()+.?[\\\]^{|}]/g, String.raw`\$&`))
    .join('.*');
  return {
    length: normalized.length,
    isAllow,
    pattern: new RegExp(`^${source}${isAnchored ? '$' : ''}`),
  };
}

// Returns a check for a URL path (plus query, if any). No matching rule means allowed.
export function robotsMatcher(rules: Pick<RobotsRules, 'allow' | 'disallow'>) {
  const compiled = [
    ...rules.allow.map((rule) => compileRule(rule, true)),
    ...rules.disallow.map((rule) => compileRule(rule, false)),
  ];
  return function isAllowed(pathAndQuery: string): boolean {
    const path = normalizePath(pathAndQuery);
    let best: CompiledRule | undefined;
    for (const rule of compiled) {
      if (!rule.pattern.test(path)) {
        continue;
      }
      const isLonger = best === undefined || rule.length > best.length;
      const isAllowTie = rule.isAllow && rule.length === best?.length;
      if (isLonger || isAllowTie) {
        best = rule;
      }
    }
    return best?.isAllow ?? true;
  };
}

// RFC 9309 sections 2.3.1.3-4: an unreachable robots.txt (5xx or network error) means
// "disallow all"; a 4xx means "no rules".
export const DISALLOW_ALL: RobotsRules = {
  sitemaps: [],
  allow: [],
  disallow: ['/'],
  crawlDelay: null,
};
export const NO_RULES: RobotsRules = { sitemaps: [], allow: [], disallow: [], crawlDelay: null };
