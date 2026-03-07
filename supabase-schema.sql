-- Smazání existujících tabulek (POZOR: smaže všechna data!)
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS machine_groups CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS employee_groups CASCADE;

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

-- Vytvoření tabulky pro profily uživatelů (schvalování)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Trigger pro automatické vytvoření profilu při registraci
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, is_approved)
  VALUES (new.id, new.email, false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Nastavení RLS (Row Level Security) - pro začátek povolíme vše (v produkci je dobré omezit)
ALTER TABLE employee_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Povolit vše pro employee_groups" ON employee_groups FOR ALL USING (true);
CREATE POLICY "Povolit vše pro employees" ON employees FOR ALL USING (true);
CREATE POLICY "Povolit vše pro machine_groups" ON machine_groups FOR ALL USING (true);
CREATE POLICY "Povolit vše pro machines" ON machines FOR ALL USING (true);
CREATE POLICY "Povolit vše pro shifts" ON shifts FOR ALL USING (true);
CREATE POLICY "Povolit vše pro user_profiles" ON user_profiles FOR ALL USING (true);
