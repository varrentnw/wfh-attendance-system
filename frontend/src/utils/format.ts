// `undefined` means "use the browser's own language and time zone".
const DATE_TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZoneName: 'short',
});

/** Formats a UTC ISO string from the API in the viewer's own time zone. */
export function formatDateTime(isoString: string): string {
  return DATE_TIME_FORMAT.format(new Date(isoString));
}
