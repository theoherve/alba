-- Onboarding: allow authenticated users to create organizations and check slug availability
-- Fixes 500 on GET organizations and "infinite recursion detected in policy for relation memberships"
-- 0. Helper functions (SECURITY DEFINER) to break RLS recursion on memberships
-- Policies on memberships must not reference memberships; these functions bypass RLS
CREATE OR REPLACE FUNCTION public.get_my_organization_ids() RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
SELECT organization_id
FROM public.memberships
WHERE user_id = auth.uid();
$$;
CREATE OR REPLACE FUNCTION public.get_my_owned_organization_ids() RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
SELECT organization_id
FROM public.memberships
WHERE user_id = auth.uid()
    AND role = 'owner';
$$;
-- 1. Fix memberships: drop recursive policies and recreate using helpers
DROP POLICY IF EXISTS "Users can view memberships in their orgs" ON public.memberships;
DROP POLICY IF EXISTS "Owners can manage memberships" ON public.memberships;
CREATE POLICY "Users can view memberships in their orgs" ON public.memberships FOR
SELECT USING (
        organization_id IN (
            SELECT public.get_my_organization_ids()
        )
    );
CREATE POLICY "Owners can manage memberships" ON public.memberships FOR ALL USING (
    organization_id IN (
        SELECT public.get_my_owned_organization_ids()
    )
);
-- 2. Allow users to INSERT a membership for themselves (when creating first org as owner)
CREATE POLICY "Users can add themselves as owner" ON public.memberships FOR
INSERT TO authenticated WITH CHECK (
        user_id = auth.uid()
        AND role = 'owner'
    );
-- 3. Allow authenticated users to SELECT organizations (for slug availability check)
CREATE POLICY "Authenticated can read organizations for slug check" ON public.organizations FOR
SELECT TO authenticated USING (
        auth.uid() IS NOT NULL
        AND deleted_at IS NULL
    );
-- 4. Allow authenticated users to CREATE organizations (onboarding)
CREATE POLICY "Authenticated can create organizations" ON public.organizations FOR
INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);