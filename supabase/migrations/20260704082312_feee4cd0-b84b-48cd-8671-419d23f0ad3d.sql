ALTER TABLE public.profiles
  ADD COLUMN username text UNIQUE,
  ADD COLUMN cover_image_url text,
  ADD COLUMN follower_count integer NOT NULL DEFAULT 0,
  ADD COLUMN following_count integer NOT NULL DEFAULT 0,
  ADD COLUMN post_count integer NOT NULL DEFAULT 0;

CREATE INDEX profiles_username_idx ON public.profiles (username);

CREATE TYPE public.post_type AS ENUM ('recipe_share', 'photo', 'video', 'tip');
CREATE TYPE public.media_type AS ENUM ('image', 'video');

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_type public.post_type NOT NULL DEFAULT 'photo',
  caption text,
  media_url text,
  media_type public.media_type,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  ingredients jsonb NOT NULL DEFAULT '[]',
  instructions jsonb NOT NULL DEFAULT '[]',
  cuisine text,
  category text,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  save_count integer NOT NULL DEFAULT 0,
  share_count integer NOT NULL DEFAULT 0,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT posts_has_content CHECK (
    caption IS NOT NULL OR media_url IS NOT NULL OR recipe_id IS NOT NULL
  )
);
CREATE INDEX posts_user_id_idx ON public.posts (user_id, created_at DESC);
CREATE INDEX posts_created_at_idx ON public.posts (created_at DESC);
CREATE INDEX posts_trending_idx ON public.posts (like_count DESC, created_at DESC);
CREATE INDEX posts_cuisine_idx ON public.posts (cuisine);
CREATE INDEX posts_category_idx ON public.posts (category);

GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone" ON public.posts
  FOR SELECT USING (is_hidden = false OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create their own posts" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own posts" ON public.posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete their own posts" ON public.posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL UNIQUE,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hashtags_usage_idx ON public.hashtags (usage_count DESC);

GRANT SELECT ON public.hashtags TO anon;
GRANT SELECT, INSERT ON public.hashtags TO authenticated;
GRANT ALL ON public.hashtags TO service_role;
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hashtags are viewable by everyone" ON public.hashtags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create hashtags" ON public.hashtags
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.post_hashtags (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);
CREATE INDEX post_hashtags_hashtag_idx ON public.post_hashtags (hashtag_id);

GRANT SELECT ON public.post_hashtags TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_hashtags TO authenticated;
GRANT ALL ON public.post_hashtags TO service_role;
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Post hashtags are viewable by everyone" ON public.post_hashtags FOR SELECT USING (true);
CREATE POLICY "Users tag their own posts" ON public.post_hashtags
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_id AND posts.user_id = auth.uid())
  );
CREATE POLICY "Users untag their own posts" ON public.post_hashtags
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.posts WHERE posts.id = post_id AND posts.user_id = auth.uid())
  );

CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX post_likes_post_idx ON public.post_likes (post_id);
CREATE INDEX post_likes_user_idx ON public.post_likes (user_id);

GRANT SELECT ON public.post_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are viewable by everyone" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users like posts as themselves" ON public.post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike their own likes" ON public.post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  like_count integer NOT NULL DEFAULT 0,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX post_comments_post_idx ON public.post_comments (post_id, created_at);
CREATE INDEX post_comments_parent_idx ON public.post_comments (parent_comment_id);

GRANT SELECT ON public.post_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are viewable by everyone" ON public.post_comments
  FOR SELECT USING (is_hidden = false OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users comment as themselves" ON public.post_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit their own comments" ON public.post_comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete their own comments" ON public.post_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER post_comments_updated_at BEFORE UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.post_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
CREATE INDEX post_saves_user_idx ON public.post_saves (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.post_saves TO authenticated;
GRANT ALL ON public.post_saves TO service_role;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own saves" ON public.post_saves
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX follows_follower_idx ON public.follows (follower_id);
CREATE INDEX follows_following_idx ON public.follows (following_id);

GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follow graph is viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users follow as themselves" ON public.follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users unfollow as themselves" ON public.follows
  FOR DELETE TO authenticated USING (auth.uid() = follower_id);

CREATE OR REPLACE FUNCTION public.handle_post_like_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER post_likes_count_trigger AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_post_like_change();

CREATE OR REPLACE FUNCTION public.handle_post_comment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER post_comments_count_trigger AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_post_comment_change();

CREATE OR REPLACE FUNCTION public.handle_post_save_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET save_count = save_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET save_count = GREATEST(save_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER post_saves_count_trigger AFTER INSERT OR DELETE ON public.post_saves
  FOR EACH ROW EXECUTE FUNCTION public.handle_post_save_change();

CREATE OR REPLACE FUNCTION public.handle_follow_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE public.profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER follows_count_trigger AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.handle_follow_change();

CREATE OR REPLACE FUNCTION public.handle_post_count_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET post_count = post_count + 1 WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET post_count = GREATEST(post_count - 1, 0) WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER posts_count_trigger AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_post_count_change();

CREATE OR REPLACE FUNCTION public.handle_hashtag_usage_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.hashtags SET usage_count = usage_count + 1 WHERE id = NEW.hashtag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.hashtags SET usage_count = GREATEST(usage_count - 1, 0) WHERE id = OLD.hashtag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;
CREATE TRIGGER post_hashtags_usage_trigger AFTER INSERT OR DELETE ON public.post_hashtags
  FOR EACH ROW EXECUTE FUNCTION public.handle_hashtag_usage_change();

REVOKE ALL ON FUNCTION public.handle_post_like_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_post_comment_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_post_save_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_follow_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_post_count_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_hashtag_usage_change() FROM PUBLIC, anon, authenticated;

CREATE POLICY "Community media is publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'community-media');
CREATE POLICY "Users upload media into their own folder" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Users manage their own media" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Users delete their own media" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'community-media' AND (storage.foldername(name))[1] = auth.uid()::text
  );