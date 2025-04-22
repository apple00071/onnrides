import { Grid } from '@/components/layout/Grid';

export default function AboutPage() {
  return (
    <div className="py-8 space-y-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl xs:text-4xl font-bold mb-8">About OnnRides</h1>
        
        {/* Mission Statement */}
        <section className="mb-12">
          <h2 className="text-xl xs:text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed">
            At OnnRides, we&apos;re on a mission to revolutionize the way people experience two-wheeler mobility. 
            We believe in providing convenient, affordable, and reliable vehicle rentals that empower people to 
            explore and commute with freedom.
          </p>
        </section>

        {/* Why Choose Us */}
        <section className="mb-12">
          <h2 className="text-xl xs:text-2xl font-semibold mb-6">Why Choose Us</h2>
          <Grid cols={1} mdCols={3} gap={6}>
            <div className="bg-white p-4 xs:p-6 rounded-lg shadow-sm">
              <h3 className="text-lg xs:text-xl font-semibold mb-3">Wide Selection</h3>
              <p className="text-gray-600">
                Choose from our extensive fleet of well-maintained bikes and scooters.
              </p>
            </div>
            <div className="bg-white p-4 xs:p-6 rounded-lg shadow-sm">
              <h3 className="text-lg xs:text-xl font-semibold mb-3">24/7 Support</h3>
              <p className="text-gray-600">
                Our dedicated team is always ready to assist you whenever you need help.
              </p>
            </div>
            <div className="bg-white p-4 xs:p-6 rounded-lg shadow-sm">
              <h3 className="text-lg xs:text-xl font-semibold mb-3">Best Prices</h3>
              <p className="text-gray-600">
                Competitive rates with no hidden charges. Get the best value for your money.
              </p>
            </div>
          </Grid>
        </section>

        {/* Our Story */}
        <section className="mb-12">
          <h2 className="text-xl xs:text-2xl font-semibold mb-4">Our Story</h2>
          <div className="space-y-4">
            <p className="text-gray-600 leading-relaxed">
              Founded in 2023, OnnRides started with a simple idea: make two-wheeler rentals accessible to everyone. 
              What began as a small fleet in Hyderabad has now grown into a trusted mobility partner across multiple cities.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Today, we serve thousands of customers, providing them with the freedom to ride whenever and wherever 
              they want. Our commitment to quality service and customer satisfaction remains at the heart of everything we do.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
} 