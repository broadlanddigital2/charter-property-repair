NB!

- DO NOT create any orders as orders data is pushed into live DB
- Currently we use test job for claim process - "60127e64-86fe-4643-b259-8895668849b4", uncomment code in
  "website_code/frontend/pages/dashboard.tsx" after testing is finished
- For order we use random order - "b7f03eb3-a647-413f-b2a4-7e804792bdb9" - this also should be changes on 
  orders details page after it'll be tested

Price bands:
Products are just added to a grade (price band)
So eg grades 1, 2 and 3
If grade 3 is set = grade 3 products would be in budget, everything else with show the lozenge Extra Cost.
If grade 2 is set = everything is grade 3 and 2 would show as in budget and grade 1 would show as extra costs.
If grade 1 is set = everything is in budget.
