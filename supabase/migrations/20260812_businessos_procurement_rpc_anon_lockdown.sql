-- BusinessOS v0.2: explicitly prevent anonymous execution of procurement RPCs.

revoke execute on function public.create_purchase_request(jsonb,jsonb) from anon;
revoke execute on function public.submit_purchase_request(bigint) from anon;
revoke execute on function public.review_purchase_request(bigint,text,text) from anon;
revoke execute on function public.create_purchase_order_from_request(bigint,uuid,bigint[],date,text) from anon;
revoke execute on function public.set_purchase_order_status(bigint,text) from anon;

grant execute on function public.create_purchase_request(jsonb,jsonb) to authenticated;
grant execute on function public.submit_purchase_request(bigint) to authenticated;
grant execute on function public.review_purchase_request(bigint,text,text) to authenticated;
grant execute on function public.create_purchase_order_from_request(bigint,uuid,bigint[],date,text) to authenticated;
grant execute on function public.set_purchase_order_status(bigint,text) to authenticated;
