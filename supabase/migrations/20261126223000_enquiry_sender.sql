-- Website enquiries: send from noreply@, deliver to mail@.
update private.app_config set value = 'noreply@charterpropertyrepairs.co.uk' where key = 'ENQUIRY_FROM';
update private.app_config set value = 'mail@charterpropertyrepairs.co.uk'   where key = 'ENQUIRY_TO';
