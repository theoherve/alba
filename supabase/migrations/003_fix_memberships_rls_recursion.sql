-- Fix "infinite recursion detected in policy for relation memberships"
-- Policies on memberships referenced memberships in USING → recursion. Use SECURITY DEFINER helpers.
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