
import { supabaseAdmin } from './lib/supabase';
import * as dotenv from 'dotenv';
dotenv.config();

async function listBuckets() {
    const { data, error } = await supabaseAdmin.storage.listBuckets();

    if (error) {
        console.error('Error listing buckets:', error);
        return;
    }

    console.log('Available buckets:');
    data.forEach(bucket => {
        console.log(`- ${bucket.name} (Public: ${bucket.public})`);
    });
}

listBuckets();
