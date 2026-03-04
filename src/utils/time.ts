import { startOfDay, addMinutes } from 'date-fns';

export const getAbsoluteMinute = (date: Date) => Math.floor(date.getTime() / 60000);
export const getDateFromAbsoluteMinute = (minute: number) => new Date(minute * 60000);

export const getDayStartMinute = (date: Date) => {
  const start = startOfDay(date);
  return getAbsoluteMinute(addMinutes(start, 120)); // 02:00
};
