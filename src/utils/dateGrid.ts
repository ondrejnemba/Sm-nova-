import { addDays, startOfWeek } from 'date-fns';

export const getGridDays = () => {
  const today = new Date();
  const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
  const startOfPastWeek = addDays(startOfCurrentWeek, -7);
  
  return Array.from({ length: 28 }).map((_, i) => {
    return addDays(startOfPastWeek, i);
  });
};
