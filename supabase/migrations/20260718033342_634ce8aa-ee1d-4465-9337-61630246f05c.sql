
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Categories
CREATE TABLE public.qr_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#4f46e5',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_categories TO authenticated;
GRANT ALL ON public.qr_categories TO service_role;
ALTER TABLE public.qr_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own categories" ON public.qr_categories FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- QR Codes
CREATE TYPE public.qr_type AS ENUM (
  'url','website','multi_link','vcard','whatsapp','phone','email','sms',
  'maps','upi','pdf','image','video','file','text','wifi'
);
CREATE TYPE public.qr_status AS ENUM ('active','inactive','expired');

CREATE TABLE public.qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.qr_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  type qr_type NOT NULL,
  is_dynamic boolean NOT NULL DEFAULT false,
  short_code text UNIQUE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  design jsonb NOT NULL DEFAULT '{}'::jsonb,
  status qr_status NOT NULL DEFAULT 'active',
  is_favorite boolean NOT NULL DEFAULT false,
  password_hash text,
  expires_at timestamptz,
  scan_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qr_codes_user_idx ON public.qr_codes(user_id);
CREATE INDEX qr_codes_short_idx ON public.qr_codes(short_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_codes TO authenticated;
GRANT SELECT ON public.qr_codes TO anon;
GRANT ALL ON public.qr_codes TO service_role;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own qr codes" ON public.qr_codes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "anon can resolve active dynamic" ON public.qr_codes FOR SELECT TO anon USING (
  is_dynamic = true AND status = 'active' AND (expires_at IS NULL OR expires_at > now())
);

-- Scans
CREATE TABLE public.qr_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id uuid NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  device text,
  browser text,
  os text,
  country text,
  referrer text,
  scanned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX qr_scans_qr_idx ON public.qr_scans(qr_id);
CREATE INDEX qr_scans_time_idx ON public.qr_scans(scanned_at);
GRANT SELECT ON public.qr_scans TO authenticated;
GRANT INSERT ON public.qr_scans TO anon;
GRANT ALL ON public.qr_scans TO service_role;
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read scans" ON public.qr_scans FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.qr_codes q WHERE q.id = qr_scans.qr_id AND q.user_id = auth.uid())
);
CREATE POLICY "anon insert scans" ON public.qr_scans FOR INSERT TO anon WITH CHECK (true);

-- Increment scan_count trigger
CREATE OR REPLACE FUNCTION public.bump_scan_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.qr_codes SET scan_count = scan_count + 1 WHERE id = NEW.qr_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_scan_recorded AFTER INSERT ON public.qr_scans FOR EACH ROW EXECUTE FUNCTION public.bump_scan_count();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER qr_codes_set_updated_at BEFORE UPDATE ON public.qr_codes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-expire validation via trigger (CHECK can't use now())
CREATE OR REPLACE FUNCTION public.auto_expire_qr() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER qr_auto_expire BEFORE INSERT OR UPDATE ON public.qr_codes FOR EACH ROW EXECUTE FUNCTION public.auto_expire_qr();
