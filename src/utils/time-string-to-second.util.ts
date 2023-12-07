export default function timeStringToSeconds(timeString: string): number {
  const timeComponents: string[] = timeString.split('-');
  let seconds = 0;
  for (const component of timeComponents) {
    const unit: string = component.slice(-1);
    const value: number = parseInt(component.slice(0, -1), 10);
    switch (unit) {
      case 'h':
        seconds += value * 3600;
        break;
      case 'm':
        seconds += value * 60;
        break;
      case 's':
        seconds += value;
        break;
      default:
        return NaN;
    }
  }
  return seconds;
}