-- Howdens mouldings/panels apply to every internal room, so don't call them "Kitchen".
update public.room_rules set item_name = 'Mouldings & panels'
  where supplier = 'Howdens' and category = 'Joinery' and name_pattern is null;
