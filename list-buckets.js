
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');

if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
} else {
    dotenv.config({ path: '.env' });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function setupBucket() {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
        console.error('Error listing buckets:', listError);
        return;
    }

    console.log('Available buckets:', buckets.map(b => b.name).join(', ') || 'None');

    const targetBucket = 'vehicles';
    const exists = buckets.some(b => b.name === targetBucket);

    if (!exists) {
        console.log(`Creating bucket: ${targetBucket}...`);
        const { data, error } = await supabaseAdmin.storage.createBucket(targetBucket, {
            public: true,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
            fileSizeLimit: 5242880 // 5MB
        });

        if (error) {
            console.error(`Error creating bucket ${targetBucket}:`, error);
        } else {
            console.log(`Bucket ${targetBucket} created successfully!`);
        }
    } else {
        console.log(`Bucket ${targetBucket} already exists.`);
    }
}

setupBucket();
