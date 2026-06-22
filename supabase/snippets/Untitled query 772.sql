GRANT ALL ON public.documents TO service_role;
GRANT EXECUTE ON FUNCTION match_documents(vector, double precision, integer) TO service_role;