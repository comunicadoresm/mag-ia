UPDATE agents 
SET model = 'claude-3-5-sonnet-20241022', api_key = NULL 
WHERE id IN (
  'f9820185-bcec-4e98-97e6-869dd0b1ebb4',
  'be850e34-97e3-4c47-b682-d0a8c207dc5e',
  'e26e1925-9707-4392-b7ef-8138005e4078'
);