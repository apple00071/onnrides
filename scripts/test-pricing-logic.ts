import { calculateRentalPrice } from '../lib/utils/price';

const testPricing = {
    price_per_hour: 50,
    price_7_days: 1499,
    price_15_days: 2499,
    price_30_days: 3999
};

function runTest(days: number, isWeekend: boolean = false) {
    const hours = days * 24;
    const price = calculateRentalPrice(testPricing, hours, isWeekend);
    console.log(`Duration: ${days} days | Weekend: ${isWeekend} | Total Price: ${price.toFixed(2)}`);

    // Verification logic
    if (days >= 7 && days < 15) {
        const expected = days * (testPricing.price_7_days / 7);
        console.log(`  Expected (7d range): ${expected.toFixed(2)}`);
    } else if (days >= 15 && days < 25) {
        const expected = days * (testPricing.price_15_days / 15);
        console.log(`  Expected (15d range): ${expected.toFixed(2)}`);
    } else if (days >= 25 && days <= 31) {
        const expected = days * (testPricing.price_30_days / 30);
        console.log(`  Expected (30d range): ${expected.toFixed(2)}`);
    } else if (days > 31) {
        if (days === 45) {
            const expected = testPricing.price_30_days + testPricing.price_15_days;
            console.log(`  Expected (45d = 30d + 15d): ${expected.toFixed(2)}`);
        }
    }
}

console.log("--- Range [7-14] (Calculated using 7-day rate) ---");
runTest(7);
runTest(10);
runTest(14);

console.log("\n--- Range [15-24] (Calculated using 15-day rate) ---");
runTest(15);
runTest(20);
runTest(24.9);

console.log("\n--- Range [25-44] (Calculated using 30-day rate) ---");
runTest(25);
runTest(30);
runTest(44.9);

console.log("\n--- Milestone [45-59] (30-day rate - 50) ---");
runTest(45);
runTest(50);
runTest(59);

console.log("\n--- Milestone [60+] (30-day rate - 100) ---");
runTest(60);
runTest(90);

console.log("\n--- Standard (<7) ---");
runTest(1);
runTest(6);
runTest(1, true); // Weekend (Min 24h)
