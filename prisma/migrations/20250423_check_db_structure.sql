SELECT 
    table_name, 
    column_name, 
    data_type 
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' AND 
    (table_name = 'users' OR table_name = 'bookings')
ORDER BY 
    table_name, 
    column_name; 