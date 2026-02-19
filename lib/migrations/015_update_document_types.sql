-- Add new document types to the documents_type_check constraint
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;

ALTER TABLE documents ADD CONSTRAINT documents_type_check CHECK (
  type IN (
    'license', 
    'id_proof', 
    'address_proof', 
    'dl_front', 
    'dl_back', 
    'aadhaar_front', 
    'aadhaar_back', 
    'customer_photo',
    'driving_license'
  )
);
