-- Vytvoření tabulky pro skupiny zaměstnanců
CREATE TABLE employee_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Vytvoření tabulky pro zaměstnance
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  "weeklyLimitHours" INTEGER NOT NULL,
  "maxShiftHours" INTEGER NOT NULL,
  "allowedMachineIds" TEXT[] NOT NULL,
  "groupId" TEXT REFERENCES employee_groups(id) ON DELETE SET NULL
);

-- Vytvoření tabulky pro skupiny strojů (střediska)
CREATE TABLE machine_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Vytvoření tabulky pro stroje
CREATE TABLE machines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "groupId" TEXT NOT NULL REFERENCES machine_groups(id) ON DELETE CASCADE,
  capacity INTEGER NOT NULL,
  "minCapacity" INTEGER,
  "idealCapacity" INTEGER,
  "virtualColumns" INTEGER
);

-- Vytvoření tabulky pro směny
CREATE TABLE shifts (
  id TEXT PRIMARY KEY,
  "machineId" TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  "employeeIds" TEXT[] NOT NULL,
  "startMinuteAbsolute" INTEGER NOT NULL,
  "endMinuteAbsolute" INTEGER NOT NULL,
  "subColumnIndex" INTEGER
);

-- Nastavení RLS (Row Level Security) - pro začátek povolíme vše (v produkci je dobré omezit)
ALTER TABLE employee_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Povolit vše pro employee_groups" ON employee_groups FOR ALL USING (true);
CREATE POLICY "Povolit vše pro employees" ON employees FOR ALL USING (true);
CREATE POLICY "Povolit vše pro machine_groups" ON machine_groups FOR ALL USING (true);
CREATE POLICY "Povolit vše pro machines" ON machines FOR ALL USING (true);
CREATE POLICY "Povolit vše pro shifts" ON shifts FOR ALL USING (true);
