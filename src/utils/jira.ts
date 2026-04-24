const JIRA_TICKET_PATTERN =
  /(?:https?:\/\/[a-zA-Z0-9.-]+\.atlassian\.net\/browse\/)?([A-Z][A-Z0-9_]+-\d+)/g;

export function extractJiraTickets(text: string): string[] {
  const matches = new Set<string>();
  for (const match of text.matchAll(JIRA_TICKET_PATTERN)) {
    matches.add(match[1]);
  }
  return [...matches];
}
