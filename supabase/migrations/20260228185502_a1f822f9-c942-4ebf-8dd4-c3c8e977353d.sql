
-- 1. Create a security definer function to check advisor department match
CREATE OR REPLACE FUNCTION public.advisor_same_department(_advisor_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles advisor
    JOIN public.profiles student ON student.id = _student_id
    WHERE advisor.id = _advisor_id
      AND advisor.department = student.department
      AND advisor.department != ''
  )
$$;

-- 2. Drop old permissive advisor policies on cv_submissions
DROP POLICY IF EXISTS "Advisors can view submissions" ON public.cv_submissions;
DROP POLICY IF EXISTS "Advisors can update submissions" ON public.cv_submissions;

-- 3. Create department-scoped advisor policies on cv_submissions
CREATE POLICY "Advisors can view dept submissions"
ON public.cv_submissions FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'advisor'::app_role)
  AND public.advisor_same_department(auth.uid(), student_id)
);

CREATE POLICY "Advisors can update dept submissions"
ON public.cv_submissions FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'advisor'::app_role)
  AND public.advisor_same_department(auth.uid(), student_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'advisor'::app_role)
  AND public.advisor_same_department(auth.uid(), student_id)
);

-- 4. Drop old advisor policy on profiles
DROP POLICY IF EXISTS "Advisors can view department profiles" ON public.profiles;

-- 5. Create department-scoped advisor policy on profiles
CREATE POLICY "Advisors can view dept profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'advisor'::app_role)
  AND department = (SELECT department FROM public.profiles WHERE id = auth.uid())
);

-- 6. Add GIN index on cv_data for JSONB search
CREATE INDEX IF NOT EXISTS idx_cv_submissions_cv_data ON public.cv_submissions USING GIN (cv_data);
