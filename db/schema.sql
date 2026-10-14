-- Anesthesia Connect MVP schema. Source of truth for the API layer.
-- Applied automatically by postgres on a fresh data volume.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid, crypt/gen_salt (bcrypt-compatible)

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name  text NOT NULL,
  role          text NOT NULL CHECK (role IN ('prospective', 'srna', 'crna')),
  school        text,
  grad_year     int,
  bio           text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE programs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  city          text,
  state         text,
  degree        text,
  length_months int,
  deadline      date,
  tuition       text,
  website       text,
  source_url    text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE applications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'researching'
             CHECK (status IN ('researching','preparing','submitted','interview','accepted','rejected','waitlisted')),
  deadline   date,
  notes      text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_id)
);
CREATE INDEX applications_user_idx ON applications(user_id);

CREATE TABLE resources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  url           text NOT NULL,
  source        text NOT NULL,
  category      text NOT NULL,
  description   text,
  revision_date date,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resources_category_idx ON resources(category);

CREATE TABLE bookmarks (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource_id)
);

CREATE TABLE resource_views (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  viewed_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, resource_id)
);

CREATE TABLE posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category     text NOT NULL CHECK (category IN ('admissions','study','practice','networking')),
  title        text NOT NULL,
  body         text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_category_idx ON posts(category, created_at DESC);

CREATE TABLE comments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id     uuid REFERENCES comments(id) ON DELETE CASCADE,
  body          text NOT NULL,
  helpful_count int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_post_idx ON comments(post_id);

CREATE TABLE comment_votes (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

CREATE TABLE groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  kind        text NOT NULL DEFAULT 'public' CHECK (kind IN ('public','private','invite')),
  category    text,
  created_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  group_id   uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       text NOT NULL,
  pinned     boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_group_idx ON messages(group_id, created_at);

CREATE TABLE events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id   uuid REFERENCES groups(id) ON DELETE CASCADE,
  title      text NOT NULL,
  category   text NOT NULL DEFAULT 'other'
             CHECK (category IN ('shift','class','clinical','exam','shadowing','interview','deadline','study','other')),
  starts_at  timestamptz NOT NULL,
  ends_at    timestamptz,
  all_day    boolean NOT NULL DEFAULT false,
  recurrence text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_user_idx ON events(user_id, starts_at);

CREATE TABLE decks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  author      text NOT NULL DEFAULT 'Anesthesia Connect',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cards (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id  uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front    text NOT NULL,
  back     text NOT NULL,
  position int NOT NULL DEFAULT 0
);
CREATE INDEX cards_deck_idx ON cards(deck_id, position);

CREATE TABLE deck_saves (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id    uuid NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, deck_id)
);

CREATE TABLE quizzes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text
);

CREATE TABLE quiz_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id       uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  prompt        text NOT NULL,
  options       jsonb NOT NULL,
  correct_index int NOT NULL,
  explanation   text,
  position      int NOT NULL DEFAULT 0
);
CREATE INDEX quiz_questions_quiz_idx ON quiz_questions(quiz_id, position);

CREATE TABLE quiz_attempts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id    uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score      int NOT NULL,
  total      int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quiz_attempts_user_idx ON quiz_attempts(user_id, created_at DESC);

-- Calculators are computed client-side; this table stores documentation and
-- the clinical-governance metadata the briefing requires (source, reviewer,
-- review date, version history anchor).
CREATE TABLE calculators (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text,
  formula     text NOT NULL,
  source      text,
  version     text NOT NULL DEFAULT '1.0.0',
  reviewed_by text,
  review_date date
);
