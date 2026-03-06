-- 1. Vytvoření tabulky pro skupiny zaměstnanců (pokud ještě neexistuje)
CREATE TABLE IF NOT EXISTS employee_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- 2. Přidání sloupce groupId do tabulky employees (pokud ještě neexistuje)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'groupId'
  ) THEN
    ALTER TABLE employees ADD COLUMN "groupId" TEXT REFERENCES employee_groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Nastavení RLS (Row Level Security) pro novou tabulku
ALTER TABLE employee_groups ENABLE ROW LEVEL SECURITY;

-- 4. Vytvoření politiky pro povolení všech operací (pokud ještě neexistuje)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'employee_groups' AND policyname = 'Povolit vše pro employee_groups'
  ) THEN
    CREATE POLICY "Povolit vše pro employee_groups" ON employee_groups FOR ALL USING (true);
  END IF;
END $$;

-- 5. Upozornění pro Supabase, aby si obnovil mezipaměť schématu (důležité!)
NOTIFY pgrst, 'reload schema';
