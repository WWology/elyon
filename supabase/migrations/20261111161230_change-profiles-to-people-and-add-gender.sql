ALTER TABLE "public"."profiles"
  DROP CONSTRAINT "profiles_id_fkey";

DROP TABLE "public"."profiles";

CREATE TABLE "public"."people" (
  "id"         uuid                     NOT NULL,
  "updated_at" timestamp with time zone,
  "full_name"  text                     NOT NULL,
  "avatar_url" text,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."people"
  ENABLE ROW LEVEL SECURITY;

CREATE TYPE "public"."gender" AS ENUM (
  'M',
  'F'
);

ALTER TABLE "public"."people"
  ADD COLUMN "gender" public.gender NOT NULL;

ALTER TABLE "public"."people"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Public profiles are viewable by everyone." ON "public"."people"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Users can insert their own profile." ON "public"."people"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY "Users can update own profile." ON "public"."people"
  FOR UPDATE
  TO PUBLIC
  USING ((( SELECT auth.uid() AS uid) = id));

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."people" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."people" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."people" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."people" TO "service_role";
