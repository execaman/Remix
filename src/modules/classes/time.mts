export default class Time {
  static get intl() {
    return Intl;
  }

  static toString() {
    return this.formatDuration(new Date(), "IST");
  }

  static eval(input: string, ms = false) {
    const digits = input.match(/\d+/g)?.reverse();
    if (!digits || digits.length > 7) {
      throw new Error(`Expected 'YY:MM:DD:hh:mm:ss:ms' got '${digits?.join(":")}'`);
    }
    const map = [1e3, 6e4, 36e5, 864e5, 2592e6, 31104e6];
    const result = digits.reduce(
      (total, current, index) => (total += Number(current) * map[index]),
      digits.length === 7 || digits[0].length === 3 ? Number(digits.shift()) : 0
    );
    return !ms ? Math.floor(result / 1e3) : result;
  }

  static ms(input: string, clock = false) {
    const time = this.eval(input, true);
    return !clock ? time : time % 1e3;
  }

  static seconds(input: string, clock = false) {
    const time = this.eval(input);
    return !clock ? time : time % 60;
  }

  static minutes(input: string, clock = false) {
    const time = Math.floor(this.eval(input) / 60);
    return !clock ? time : time % 60;
  }

  static hours(input: string, clock = false) {
    const time = Math.floor(this.eval(input) / 3600);
    return !clock ? time : time % 3600;
  }

  static formatDuration(duration?: number | Date, timeZone = "UTC") {
    const { format } = new Intl.DateTimeFormat("en", {
      timeZone,
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    return (
      typeof duration === "number" ? format(duration * 1e3)
      : duration instanceof Date ? format(duration)
      : format()
    );
  }
}
