const WIB_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });

export function toWorkDate(instant: Date): string {
  return WIB_DATE.format(instant);
}
