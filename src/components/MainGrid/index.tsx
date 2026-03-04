import { DayPanel } from './DayPanel';
import { ProductionGrid } from './ProductionGrid';

export const MainGrid = () => {
  return (
    <div className="flex flex-1 overflow-hidden">
      <DayPanel />
      <ProductionGrid />
    </div>
  );
};
