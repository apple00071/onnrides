import 'dotenv/config';
import { query } from '../lib/db';
import { Vehicle } from '../lib/schema';
import fs from 'fs';

async function analyzePricing() {
    try {
        const result = await query<Vehicle>('SELECT name, price_per_hour, price_7_days, price_15_days, price_30_days FROM vehicles WHERE status = $1', ['active']);
        const vehicles = result.rows;
        const analysis = vehicles.map(v => {
            const h24 = v.price_per_hour * 24;
            const d7 = v.price_7_days ? (v.price_7_days / 7) : 0;
            const d15 = v.price_15_days ? (v.price_15_days / 15) : 0;
            const d30 = v.price_30_days ? (v.price_30_days / 30) : 0;

            return {
                name: v.name,
                daily_base: h24,
                daily_7: d7,
                daily_15: d15,
                daily_30: d30,
                discount_7: d7 > 0 ? ((h24 - d7) / h24) : 0,
                discount_15: d15 > 0 ? ((d7 || h24 - d15) / (d7 || h24)) : 0,
                discount_30: d30 > 0 ? ((d15 || d7 || h24 - d30) / (d15 || d7 || h24)) : 0
            };
        });

        fs.writeFileSync('pricing-analysis.json', JSON.stringify(analysis, null, 2));
        console.log('Analysis written to pricing-analysis.json');
    } catch (error) {
        console.error('Error analyzing pricing:', error);
    } finally {
        process.exit(0);
    }
}

analyzePricing();
